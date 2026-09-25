/**
 * objetivos: servicio de objetivos de un proyecto (plan §3, crítica B5).
 *
 * Una sola implementación para las rutas HTTP y las herramientas MCP
 * (Principio VIII): cada función recibe `ctx`, controla permisos adentro,
 * valida con los esquemas de `objectives/validation.ts`, lanza `ApiError` y
 * emite los eventos en vivo DESPUÉS del commit de su transacción. Las rutas y
 * el MCP no emiten nada por su cuenta (el `logMcpActivity` sí queda en el MCP).
 *
 * Reglas comunes:
 * - Toda mutación pasa por `requireWorkAccess(ctx, workId, "operate")`: 404
 *   sin acceso, 403 si solo lee o el rol no escribe (READER), 409
 *   `WORK_ARCHIVED` si el proyecto está archivado.
 * - Una plantilla nunca tiene objetivos: crear o insertar en una plantilla es
 *   400 `TEMPLATE_NO_OBJECTIVES`.
 * - `Objective.position` y `Task.position` de las raíces quedan densas
 *   (0..n-1) después de cada operación que saca o mete elementos.
 *
 * Imports: este módulo importa de `@/server/tasks` y `@/server/works`, nunca
 * al revés (ver el comentario de `objectives/select.ts` sobre ciclos).
 */

import { z } from "zod";
import type { Objective, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ApiError, badRequest, conflict, notFound } from "@/server/api";
import { emit } from "@/server/events";
import { ACTIVE_TEMPLATE_WORK } from "@/server/workFilters";
import { requireReadableTemplate, requireWorkAccess } from "@/server/works";
import { getTaskOrThrow, nextPosition, rootScopeWhere, type TaskWithLinks } from "@/server/tasks";
import { access, type Access, type UserContext } from "@/lib/domain/permissions";
import {
  DELETE_OBJECTIVE_MODES,
  OBJECTIVE_TITLE_MAX,
  objectiveDescriptionSchema,
  objectiveTitleSchema,
  type DeleteObjectiveMode,
} from "@/lib/domain/objectives/validation";
import { objectiveTaskCounts, type TaskCounts } from "@/lib/domain/objectives/progress";
import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import { insertAt, sameIdSet } from "@/lib/domain/objectives/ordering";
import {
  cloneTaskTree,
  insertTemplateAsObjectiveTx,
  nextObjectivePosition,
} from "@/lib/domain/works/cloneFromTemplate";

type TxClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

/**
 * Objetivo tal como viaja en la API web (`GET /api/works/[id]`, respuestas de
 * crear/editar/reordenar) y en el MCP. Sin tareas ni contadores: la web los
 * deriva de la lista plana de tareas (crítica B1/B3).
 */
export interface ObjectiveDto {
  id: string;
  title: string;
  description: string | null;
  position: number;
  sourceTemplateId: string | null;
}

export function toObjectiveDto(
  o: Pick<Objective, "id" | "title" | "description" | "position" | "sourceTemplateId">,
): ObjectiveDto {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    position: o.position,
    sourceTemplateId: o.sourceTemplateId,
  };
}

/** Objetivo con su progreso (`listObjectives`, MCP `objective.list`/`work.get`). */
export interface ObjectiveWithCountsDto extends ObjectiveDto {
  taskCounts: TaskCounts;
}

/** Plantilla insertable como objetivo (`listTemplates`). */
export interface TemplateSummaryDto {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  /**
   * Tareas que se copiarían al insertarla: las IN_PROGRESS de todos los
   * niveles (crítica I9). Es el mismo número que devuelve `copiedTasks`.
   */
  copyableTaskCount: number;
}

// ---------------------------------------------------------------------------
// Errores y helpers
// ---------------------------------------------------------------------------

const OBJECTIVE_NOT_FOUND = "Objetivo no encontrado";

const templateHasNoObjectives = () =>
  new ApiError(400, "TEMPLATE_NO_OBJECTIVES", "Las plantillas no tienen objetivos");

/** Orden canónico de los objetivos de un proyecto (desempata `createdAt`). */
const OBJECTIVE_ORDER = [
  { position: "asc" },
  { createdAt: "asc" },
] satisfies Prisma.ObjectiveOrderByWithRelationInput[];
/** Orden canónico de las raíces de una sección. */
const TASK_ORDER = [
  { position: "asc" },
  { createdAt: "asc" },
] satisfies Prisma.TaskOrderByWithRelationInput[];

/**
 * Escribe `position = índice` para cada id de `orderedIds`, salteando los que
 * ya la tienen (renumerado denso sin escrituras de más).
 */
async function applyDenseOrder(
  orderedIds: readonly string[],
  currentPosition: ReadonlyMap<string, number>,
  write: (id: string, position: number) => Promise<unknown>,
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => (currentPosition.get(id) === index ? null : write(id, index))),
  );
}

/** Deja densas las posiciones de los objetivos de `workId`, en su orden actual. */
async function compactObjectivePositions(tx: TxClient, workId: string): Promise<void> {
  const rows = await tx.objective.findMany({
    where: { workId },
    orderBy: OBJECTIVE_ORDER,
    select: { id: true, position: true },
  });
  await applyDenseOrder(
    rows.map((r) => r.id),
    new Map(rows.map((r) => [r.id, r.position])),
    (id, position) => tx.objective.update({ where: { id }, data: { position } }),
  );
}

async function listObjectiveDtos(
  db: TxClient | typeof prisma,
  workId: string,
): Promise<ObjectiveDto[]> {
  const rows = await db.objective.findMany({ where: { workId }, orderBy: OBJECTIVE_ORDER });
  return rows.map(toObjectiveDto);
}

/**
 * Avisos en vivo de una mutación ya commiteada: `task-changed` a los sectores
 * de las tareas tocadas (si hay) y `work-changed` del proyecto. El primero
 * lleva UNA tarea representativa: el cliente filtra por `workId`/`sectorIds`,
 * no por `taskId`, y un evento por tarea dispararía una recarga por tarea.
 */
function emitObjectiveChange(
  workId: string,
  touched?: { taskId: string | undefined; sectorIds: Iterable<string> },
) {
  if (touched?.taskId) {
    const sectorIds = [...new Set(touched.sectorIds)];
    if (sectorIds.length > 0)
      emit({ type: "task-changed", taskId: touched.taskId, workId, sectorIds });
  }
  emit({ type: "work-changed", workId });
}

const sectorIdsOf = (links: readonly { sectorId: string | null }[]) =>
  links.map((l) => l.sectorId).filter((id): id is string => id !== null);

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Carga un objetivo exigiendo `need` sobre su proyecto. Sin acceso (o si no
 * existe) responde 404 "Objetivo no encontrado" (no filtra la existencia);
 * `operate` agrega 403 (solo lectura / READER) y 409 `WORK_ARCHIVED`.
 *
 * `_count.tasks` cuenta las tareas del objetivo (raíces + hijas): es la N de
 * "Eliminar con sus N tareas" y del preview del MCP.
 */
export async function getObjectiveWithAccess(
  ctx: UserContext,
  objectiveId: string,
  need: "read" | "operate",
): Promise<{
  objective: Objective & { _count: { tasks: number } };
  work: Awaited<ReturnType<typeof requireWorkAccess>>["work"];
  level: Access;
}> {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: { _count: { select: { tasks: true } } },
  });
  if (!objective) throw notFound(OBJECTIVE_NOT_FOUND);
  try {
    const { work, level } = await requireWorkAccess(ctx, objective.workId, need);
    return { objective, work, level };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw notFound(OBJECTIVE_NOT_FOUND);
    throw err;
  }
}

/**
 * Objetivos de un proyecto, en orden, con su progreso, más el de las tareas
 * generales (MCP `objective.list` y `work.get`). Pide lectura.
 *
 * El progreso sale de las RAÍCES con sus hijas (`objectiveTaskCounts`, regla
 * de contenedor) y cada raíz cae en la sección de su `objectiveId`
 * (`groupTasksByObjective`: uno desconocido cuenta como general), así que
 * generales + objetivos suman lo mismo que el proyecto en la web y en
 * `/api/works`.
 */
export async function listObjectives(
  ctx: UserContext,
  workId: string,
): Promise<{ objectives: ObjectiveWithCountsDto[]; generalTaskCounts: TaskCounts }> {
  await requireWorkAccess(ctx, workId, "read");
  const [objectives, roots] = await Promise.all([
    prisma.objective.findMany({ where: { workId }, orderBy: OBJECTIVE_ORDER }),
    prisma.task.findMany({
      where: { workId, parentId: null },
      select: {
        objectiveId: true,
        status: { select: { type: true } },
        subtasks: { select: { status: { select: { type: true } } } },
      },
    }),
  ]);

  const countable = roots.map((r) => ({
    objectiveId: r.objectiveId,
    status: r.status,
    subtaskCount: r.subtasks.length,
    subtaskDone: r.subtasks.filter((s) => s.status.type === "FINAL").length,
  }));
  const { general, sections } = groupTasksByObjective(countable, objectives);

  return {
    objectives: sections.map((s) => ({
      ...toObjectiveDto(s.objective),
      taskCounts: objectiveTaskCounts(s.tasks),
    })),
    generalTaskCounts: objectiveTaskCounts(general),
  };
}

/**
 * Plantillas activas que `ctx` puede leer (insertables como objetivo), con
 * `copyableTaskCount`. `groupId` acota a las de ese grupo. Mismo filtro que
 * el dashboard (`ACTIVE_TEMPLATE_WORK` + `access() !== "none"`), ordenadas
 * por nombre.
 */
export async function listTemplates(
  ctx: UserContext,
  opts: { groupId?: string } = {},
): Promise<TemplateSummaryDto[]> {
  const templates = await prisma.work.findMany({
    where: { ...ACTIVE_TEMPLATE_WORK, ...(opts.groupId ? { groupId: opts.groupId } : {}) },
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      _count: { select: { tasks: { where: { status: { type: "IN_PROGRESS" } } } } },
    },
    orderBy: { name: "asc" },
  });
  return templates
    .filter(
      (t) =>
        access(ctx, {
          groupId: t.groupId,
          ownerId: t.ownerId,
          groupPublicRead: t.group?.publicRead ?? false,
        }) !== "none",
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      groupId: t.groupId,
      groupName: t.group?.name ?? null,
      copyableTaskCount: t._count.tasks,
    }));
}

// ---------------------------------------------------------------------------
// Alta y edición
// ---------------------------------------------------------------------------

const createObjectiveSchema = z.object({
  title: objectiveTitleSchema,
  description: objectiveDescriptionSchema.nullish(),
});

/**
 * Crea un objetivo vacío al final del proyecto. Operar; destino plantilla →
 * 400 `TEMPLATE_NO_OBJECTIVES`.
 */
export async function createObjective(
  ctx: UserContext,
  workId: string,
  input: { title: string; description?: string | null },
): Promise<ObjectiveDto> {
  const data = createObjectiveSchema.parse(input);
  const { work } = await requireWorkAccess(ctx, workId, "operate");
  if (work.isTemplate) throw templateHasNoObjectives();

  const objective = await prisma.$transaction(async (tx) =>
    tx.objective.create({
      data: {
        workId,
        title: data.title,
        description: data.description || null,
        position: await nextObjectivePosition(tx, workId),
        createdById: ctx.id,
      },
    }),
  );

  emitObjectiveChange(workId);
  return toObjectiveDto(objective);
}

const insertTemplateSchema = z.object({
  workId: z.string().min(1),
  templateId: z.string().min(1),
  /** Vacío o ausente → nombre de la plantilla (lo resuelve `insertTemplateAsObjectiveTx`). */
  title: z.string().trim().max(OBJECTIVE_TITLE_MAX).nullish(),
});

/**
 * Inserta una plantilla como UN objetivo al final del proyecto (copia
 * independiente de sus tareas pendientes, con subtareas). Operar el destino
 * (que no sea plantilla → 400 `TEMPLATE_NO_OBJECTIVES`) y leer la plantilla
 * (si no, 400 con el mensaje único de `requireReadableTemplate`). Avisa a los
 * sectores vinculados de las tareas copiadas.
 */
export async function insertTemplateAsObjective(
  ctx: UserContext,
  input: { workId: string; templateId: string; title?: string | null },
): Promise<ObjectiveDto & { copiedTasks: number }> {
  const { workId, templateId, title } = insertTemplateSchema.parse(input);
  const { work } = await requireWorkAccess(ctx, workId, "operate");
  if (work.isTemplate) throw templateHasNoObjectives();
  const template = await requireReadableTemplate(ctx, templateId);

  const { objective, tasks, copiedTasks, sectorIds } = await prisma.$transaction(
    (tx) => insertTemplateAsObjectiveTx(tx, { workId, template, title, actorId: ctx.id }),
    { timeout: 20_000 },
  );

  emitObjectiveChange(workId, { taskId: tasks[0]?.id, sectorIds });
  return { ...toObjectiveDto(objective), copiedTasks };
}

const updateObjectiveSchema = z
  .object({
    title: objectiveTitleSchema.optional(),
    description: objectiveDescriptionSchema.nullish(),
  })
  .refine((v) => v.title !== undefined || v.description !== undefined, {
    message: "Nada para actualizar",
  });

/** Edita título y/o descripción (vacía → null). Operar. */
export async function updateObjective(
  ctx: UserContext,
  objectiveId: string,
  input: { title?: string; description?: string | null },
): Promise<ObjectiveDto> {
  const data = updateObjectiveSchema.parse(input);
  const { objective } = await getObjectiveWithAccess(ctx, objectiveId, "operate");

  const updated = await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description || null }),
    },
  });

  emitObjectiveChange(objective.workId);
  return toObjectiveDto(updated);
}

// ---------------------------------------------------------------------------
// Orden de objetivos
// ---------------------------------------------------------------------------

const indexSchema = z.number().int().min(0, "La posición no puede ser negativa");

/**
 * Mueve un objetivo al índice `index` (desde 0; fuera de rango se recorta al
 * final) y renumera denso. Lo usan el Subir/Bajar de la web (índice ± 1) y
 * `objective.update { position }` del MCP. Devuelve los objetivos del
 * proyecto en el orden nuevo. Operar.
 */
export async function moveObjectiveTo(
  ctx: UserContext,
  objectiveId: string,
  index: number,
): Promise<ObjectiveDto[]> {
  const at = indexSchema.parse(index);
  const { objective } = await getObjectiveWithAccess(ctx, objectiveId, "operate");
  const workId = objective.workId;

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.objective.findMany({
      where: { workId },
      orderBy: OBJECTIVE_ORDER,
      select: { id: true, position: true },
    });
    await applyDenseOrder(
      insertAt(
        rows.map((r) => r.id),
        objectiveId,
        at,
      ),
      new Map(rows.map((r) => [r.id, r.position])),
      (id, position) => tx.objective.update({ where: { id }, data: { position } }),
    );
    return listObjectiveDtos(tx, workId);
  });

  emitObjectiveChange(workId);
  return result;
}

const orderedIdsSchema = z.array(z.string().min(1)).min(1, "Falta el orden de los objetivos");

/**
 * Reordena TODOS los objetivos del proyecto (`position = índice`). Si
 * `orderedObjectiveIds` no es exactamente el conjunto actual (se creó o borró
 * uno mientras se arrastraba) responde 409 `OBJECTIVE_SET_CHANGED` sin tocar
 * nada. Devuelve los objetivos en el orden nuevo. Operar.
 */
export async function reorderObjectives(
  ctx: UserContext,
  workId: string,
  orderedObjectiveIds: string[],
): Promise<ObjectiveDto[]> {
  const orderedIds = orderedIdsSchema.parse(orderedObjectiveIds);
  await requireWorkAccess(ctx, workId, "operate");

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.objective.findMany({
      where: { workId },
      select: { id: true, position: true },
    });
    if (
      !sameIdSet(
        rows.map((r) => r.id),
        orderedIds,
      )
    ) {
      throw new ApiError(
        409,
        "OBJECTIVE_SET_CHANGED",
        "El conjunto de objetivos cambió mientras reordenabas; recargá y volvé a intentar",
      );
    }
    await applyDenseOrder(
      orderedIds,
      new Map(rows.map((r) => [r.id, r.position])),
      (id, position) => tx.objective.update({ where: { id }, data: { position } }),
    );
    return listObjectiveDtos(tx, workId);
  });

  emitObjectiveChange(workId);
  return result;
}

// ---------------------------------------------------------------------------
// Eliminar
// ---------------------------------------------------------------------------

const deleteModeSchema = z.enum(DELETE_OBJECTIVE_MODES, {
  errorMap: () => ({ message: "Elegí qué hacer con las tareas: deleteTasks o moveToGeneral" }),
});

/**
 * Elimina un objetivo en una sola transacción (crítica I7). Trabaja por
 * RAÍCES (`{objectiveId, parentId: null}`); las hijas siguen a su raíz:
 * - `deleteTasks`: borra las raíces y la cascada de la FK se lleva sus hijas.
 * - `moveToGeneral`: las raíces pasan al final de las tareas generales, en su
 *   orden, y sus hijas quedan sin objetivo (conservan padre y posición).
 * Una hija con este `objectiveId` bajo una raíz de otra sección (invariante
 * roto) no se borra: el `ON DELETE SET NULL` la deja sin objetivo.
 * Después compacta `Objective.position`. `deletedTasks`/`movedTasks` cuentan
 * raíces + hijas. Operar.
 */
export async function deleteObjective(
  ctx: UserContext,
  objectiveId: string,
  mode: DeleteObjectiveMode,
): Promise<{ deletedTasks: number; movedTasks: number }> {
  const deleteMode = deleteModeSchema.parse(mode);
  const { objective } = await getObjectiveWithAccess(ctx, objectiveId, "operate");
  const workId = objective.workId;

  const { counts, touched } = await prisma.$transaction(async (tx) => {
    const roots = await tx.task.findMany({
      where: { objectiveId, parentId: null },
      orderBy: TASK_ORDER,
      select: {
        id: true,
        links: { select: { sectorId: true } },
        subtasks: { select: { id: true, links: { select: { sectorId: true } } } },
      },
    });
    const rootIds = roots.map((r) => r.id);
    const affected = roots.length + roots.reduce((n, r) => n + r.subtasks.length, 0);

    if (deleteMode === "deleteTasks") {
      if (rootIds.length > 0) await tx.task.deleteMany({ where: { id: { in: rootIds } } });
    } else {
      const base = await nextPosition(workId, null, null, null, tx);
      await Promise.all(
        rootIds.map((id, i) =>
          tx.task.update({ where: { id }, data: { objectiveId: null, position: base + i } }),
        ),
      );
      if (rootIds.length > 0) {
        await tx.task.updateMany({
          where: { parentId: { in: rootIds } },
          data: { objectiveId: null },
        });
      }
    }

    await tx.objective.delete({ where: { id: objectiveId } });
    await compactObjectivePositions(tx, workId);

    return {
      counts:
        deleteMode === "deleteTasks"
          ? { deletedTasks: affected, movedTasks: 0 }
          : { deletedTasks: 0, movedTasks: affected },
      touched: {
        taskId: rootIds[0],
        sectorIds: roots.flatMap((r) => [
          ...sectorIdsOf(r.links),
          ...r.subtasks.flatMap((c) => sectorIdsOf(c.links)),
        ]),
      },
    };
  });

  emitObjectiveChange(workId, touched);
  return counts;
}

// ---------------------------------------------------------------------------
// Mover una tarea de sección
// ---------------------------------------------------------------------------

/**
 * "Mover tarea de sección" (drag entre secciones, "Mover a objetivo…",
 * MCP `task.setObjective`). `objectiveId: null` = tareas generales.
 *
 * - Solo raíces: una subtarea vive en el objetivo de su padre → 400
 *   `SUBTASK_OBJECTIVE`. Una tarea sin proyecto → 400.
 * - Operar el proyecto de la tarea. Objetivo inexistente → 404; de otro
 *   proyecto → 400 `OBJECTIVE_WORK_MISMATCH`.
 * - Entra en `index` de la sección destino (sin `index`, al final; fuera de
 *   rango se recorta). Destino y origen quedan densos. Las hijas se mudan de
 *   sección con ella.
 * - Misma sección sin `index`: no cambia nada. Misma sección con `index`:
 *   reordena dentro de ella.
 */
export async function setTaskObjective(
  ctx: UserContext,
  taskId: string,
  objectiveId: string | null,
  opts: { index?: number } = {},
): Promise<TaskWithLinks> {
  const index = indexSchema.optional().parse(opts.index);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      workId: true,
      parentId: true,
      objectiveId: true,
      links: { select: { sectorId: true } },
      subtasks: { select: { links: { select: { sectorId: true } } } },
    },
  });
  if (!task) throw notFound("Tarea no encontrada");
  if (task.parentId) {
    throw new ApiError(
      400,
      "SUBTASK_OBJECTIVE",
      "Una subtarea vive en el objetivo de su tarea padre",
    );
  }
  if (!task.workId) throw badRequest("La tarea no pertenece a un proyecto");
  const workId = task.workId;

  await requireWorkAccess(ctx, workId, "operate");
  if (objectiveId) {
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId },
      select: { workId: true },
    });
    if (!objective) throw notFound(OBJECTIVE_NOT_FOUND);
    if (objective.workId !== workId) {
      throw new ApiError(400, "OBJECTIVE_WORK_MISMATCH", "El objetivo no pertenece a ese proyecto");
    }
  }

  const fromObjectiveId = task.objectiveId ?? null;
  const sameSection = fromObjectiveId === objectiveId;
  if (sameSection && index === undefined) return getTaskOrThrow(taskId);

  await prisma.$transaction(async (tx) => {
    const dest = await tx.task.findMany({
      where: rootScopeWhere(workId, objectiveId),
      orderBy: TASK_ORDER,
      select: { id: true, position: true },
    });
    const destOrder = insertAt(
      dest.map((t) => t.id),
      taskId,
      index,
    );
    const destPositions = new Map(dest.map((t) => [t.id, t.position]));
    // La tarea movida se escribe aparte (lleva también la sección).
    destPositions.delete(taskId);
    await applyDenseOrder(destOrder, destPositions, (id, position) =>
      id === taskId
        ? tx.task.update({ where: { id }, data: { objectiveId, position } })
        : tx.task.update({ where: { id }, data: { position } }),
    );

    if (!sameSection) {
      await tx.task.updateMany({ where: { parentId: taskId }, data: { objectiveId } });
      const source = await tx.task.findMany({
        where: rootScopeWhere(workId, fromObjectiveId),
        orderBy: TASK_ORDER,
        select: { id: true, position: true },
      });
      await applyDenseOrder(
        source.map((t) => t.id),
        new Map(source.map((t) => [t.id, t.position])),
        (id, position) => tx.task.update({ where: { id }, data: { position } }),
      );
    }
  });

  emitObjectiveChange(workId, {
    taskId,
    sectorIds: [...sectorIdsOf(task.links), ...task.subtasks.flatMap((c) => sectorIdsOf(c.links))],
  });
  return getTaskOrThrow(taskId);
}

// ---------------------------------------------------------------------------
// Guardar como plantilla
// ---------------------------------------------------------------------------

/** Reintentos ante un choque de nombre concurrente (P2002) antes de responder 409. */
const SAVE_AS_TEMPLATE_ATTEMPTS = 5;

/** "Título", "Título (2)", "Título (3)"…, recortando el título para no pasar el tope. */
function numberedName(title: string, n: number): string {
  if (n === 1) return title.slice(0, OBJECTIVE_TITLE_MAX);
  const suffix = ` (${n})`;
  return `${title.slice(0, OBJECTIVE_TITLE_MAX - suffix.length).trimEnd()}${suffix}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "P2002";
}

/**
 * Guarda un objetivo como plantilla PERSONAL del actor (`ownerId = ctx.id`,
 * sin grupo): nombre = título del objetivo, misma descripción, y copia de sus
 * tareas pendientes (con subtareas) como tareas generales de la plantilla
 * (`cloneTaskTree` con `sourceWhere: {objectiveId}`).
 *
 * Operar el proyecto de origen (el ⋮ del objetivo solo lo ve quien opera,
 * crítica B6). El nombre es único por dueño (`@@unique([ownerId, name])`,
 * compartido con los proyectos personales): si choca se usa "Título (2)",
 * "(3)"…; si otra escritura gana la carrera (P2002) se reintenta con el
 * siguiente y, agotados los reintentos, 409 (nunca 500, crítica I8).
 */
export async function saveObjectiveAsTemplate(
  ctx: UserContext,
  objectiveId: string,
): Promise<{ id: string; name: string; copiedTasks: number }> {
  const { objective } = await getObjectiveWithAccess(ctx, objectiveId, "operate");
  const title = objective.title.trim();

  const taken = new Set<string>();
  let next = 1;
  const nextFreeName = async (): Promise<string> => {
    // Por tandas: una consulta resuelve los próximos 20 candidatos.
    for (;;) {
      const batch = Array.from({ length: 20 }, (_, i) => numberedName(title, next + i));
      const existing = await prisma.work.findMany({
        where: { ownerId: ctx.id, name: { in: batch } },
        select: { name: true },
      });
      for (const w of existing) taken.add(w.name);
      for (const name of batch) {
        next++;
        if (!taken.has(name)) return name;
      }
    }
  };

  for (let attempt = 0; attempt < SAVE_AS_TEMPLATE_ATTEMPTS; attempt++) {
    const name = await nextFreeName();
    try {
      const { template, copiedTasks } = await prisma.$transaction(
        async (tx) => {
          const template = await tx.work.create({
            data: {
              name,
              description: objective.description || null,
              groupId: null,
              ownerId: ctx.id,
              createdById: ctx.id,
              isTemplate: true,
              doc: { create: {} },
            },
          });
          const cloned = await cloneTaskTree(tx, {
            sourceWhere: { objectiveId },
            destWorkId: template.id,
            destObjectiveId: null,
            actorId: ctx.id,
          });
          return { template, copiedTasks: cloned.copiedTasks };
        },
        { timeout: 20_000 },
      );
      // Solo `work-changed`: las tareas de una plantilla no aparecen en las
      // vistas de sector (higiene D15), así que no hay sectores que avisar.
      emitObjectiveChange(template.id);
      return { id: template.id, name: template.name, copiedTasks };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      taken.add(name);
    }
  }
  throw conflict("Ya existe una plantilla con ese nombre; volvé a intentar");
}
