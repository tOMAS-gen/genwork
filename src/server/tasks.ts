/**
 * Servicio de tareas: parseo de etiquetas (fuente de verdad en el backend, FR-008),
 * resolución a entidades del ámbito, permisos y vínculos tipados.
 */

import { prisma } from "@/lib/db/client";
import { parseTags, tagsBySymbol } from "@/lib/domain/tags/parser";
import { matchByTag, tagMatchesName } from "@/lib/domain/tags/matching";
import { parseDates } from "@/lib/domain/dates/parser";
import { applyStatusChange } from "@/lib/domain/tasks/state";
import {
  resolveApplicableStatusSet,
  initialStatus,
  reassignOnSectorChange,
  type TaskScopeRef,
  type TaskStatusRef,
} from "@/lib/domain/tasks/statusResolution";
import {
  canAddress,
  canToggle,
  type Scope,
  type TaskRef,
  type UserContext,
} from "@/lib/domain/permissions";
import { conflict, forbidden, notFound } from "@/server/api";
import { emit } from "@/server/events";
import type { Prisma, Sector, Task, TaskLink, TaskStatus, User, Work, Group } from "@prisma/client";

export type TaskWithLinks = Task & {
  links: (TaskLink & { sector: Sector | null; user: Pick<User, "id" | "name"> | null })[];
  work: Pick<Work, "id" | "name"> | null;
  homeSector: Pick<Sector, "id" | "name"> | null;
  status: TaskStatus;
};

const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true } },
  homeSector: { select: { id: true, name: true } },
  status: true,
} satisfies Prisma.TaskInclude;

/** Cliente Prisma o de transacción — las consultas de scope funcionan con cualquiera de los dos. */
type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * Scope de estado de una tarea (research.md D2, ajustado por feature 044): su sector EXEC
 * (pertenencia, `#`) si tiene uno, más SIEMPRE el scope de su trabajo. El sector es
 * catálogo global (feature 044) y ya no aporta groupId/ownerId, así que el workScope es el
 * default del que hereda una tarea cuyo sector EXEC no tiene conjunto propio de estados.
 */
export async function resolveStatusScope(
  workId: string | null,
  homeSectorId: string | null,
  execSectorIds: readonly string[],
  db: DbClient = prisma,
): Promise<TaskScopeRef> {
  let workScope: TaskScopeRef["workScope"] = null;
  if (workId) {
    const work = await db.work.findUnique({ where: { id: workId } });
    if (work) workScope = { groupId: work.groupId, ownerId: work.ownerId };
  }

  const sectorId = execSectorIds[0] ?? homeSectorId ?? null;
  if (sectorId) {
    const sector = await db.sector.findUnique({ where: { id: sectorId } });
    // El sector es catálogo global (feature 044): ya no aporta groupId/ownerId; solo su
    // id sirve para el override de estados por sector (TaskStatus.sectorId). El workScope
    // viaja igual para servir de fallback si el sector no tiene conjunto propio.
    if (sector) return { execSector: { id: sector.id, groupId: null, ownerId: null }, workScope };
  }
  return { execSector: null, workScope };
}

/**
 * Candidatos de TaskStatus para un scope: el override de sector (si aplica) + el default de
 * grupo/owner del work + SIEMPRE el conjunto global (groupId/ownerId/sectorId los 3 `null`),
 * que sirve de fallback de última instancia cuando ninguno de los otros conjuntos aplica
 * (ver `resolveApplicableStatusSet`, que solo lo usa si no encontró nada más específico).
 */
export async function fetchStatusCandidates(
  scope: TaskScopeRef,
  db: DbClient = prisma,
): Promise<TaskStatusRef[]> {
  const orFilters: Prisma.TaskStatusWhereInput[] = [
    { groupId: null, ownerId: null, sectorId: null }, // conjunto global — fallback de última instancia
  ];
  if (scope.execSector) orFilters.push({ sectorId: scope.execSector.id });
  // El default del work viaja siempre: es el fallback de un sector EXEC sin conjunto propio.
  if (scope.workScope) {
    if (scope.workScope.groupId) orFilters.push({ groupId: scope.workScope.groupId });
    if (scope.workScope.ownerId) orFilters.push({ ownerId: scope.workScope.ownerId });
  }
  return db.taskStatus.findMany({ where: { OR: orFilters } });
}

export function execSectorIdsOf(links: readonly { type: string; sectorId: string | null }[]): string[] {
  return links.filter((l) => l.type === "EXEC" && l.sectorId).map((l) => l.sectorId as string);
}

/**
 * Conjunto aplicable de un `TaskStatus` para incluir en respuestas de listado
 * (selector de estado en la UI, FR-011). No se restringe a nombre único: el
 * cliente resuelve display.
 */
export function statusOptionDto(s: TaskStatusRef) {
  return { id: s.id, name: s.name, color: s.color, type: s.type, sortOrder: s.sortOrder };
}

/** Conjunto de estados aplicable a una tarea, dado su scope resuelto (research.md D2). */
export async function loadApplicableStatusSet(
  workId: string | null,
  homeSectorId: string | null,
  execSectorIds: readonly string[],
  db: DbClient = prisma,
): Promise<TaskStatusRef[]> {
  const scope = await resolveStatusScope(workId, homeSectorId, execSectorIds, db);
  const candidates = await fetchStatusCandidates(scope, db);
  return resolveApplicableStatusSet(scope, candidates);
}

export function scopeOf(entity: { groupId: string | null; ownerId: string | null }): Scope {
  return { groupId: entity.groupId, ownerId: entity.ownerId };
}

function scopeWithPublic(entity: {
  groupId: string | null;
  ownerId: string | null;
  group?: Pick<Group, "publicRead"> | null;
}): Scope {
  return {
    groupId: entity.groupId,
    ownerId: entity.ownerId,
    groupPublicRead: entity.group?.publicRead ?? false,
  };
}

export async function toTaskRef(task: TaskWithLinks): Promise<TaskRef> {
  const work = task.workId
    ? await prisma.work.findUnique({ where: { id: task.workId }, include: { group: true } })
    : null;

  // Los sectores son catálogo global (feature 044): el motor de permisos solo
  // necesita sus ids planos (accessSector resuelve por SectorGrant), sin scope.
  const linkSectorIds = (type: "EXEC" | "REF"): string[] =>
    task.links
      .filter((l) => l.type === type && l.targetType === "SECTOR" && l.sectorId)
      .map((l) => l.sectorId as string);

  return {
    workScope: work ? scopeWithPublic(work) : null,
    homeSector: task.sectorId,
    execSectors: linkSectorIds("EXEC"),
    refSectors: linkSectorIds("REF"),
    refUserIds: new Set(
      task.links
        .filter((l) => l.type === "REF" && l.targetType === "USER" && l.userId)
        .map((l) => l.userId as string),
    ),
  };
}

interface ResolveInput {
  rawText: string;
  contextWorkId?: string;
  contextSectorId?: string;
}

interface Resolved {
  displayText: string;
  workId: string | null;
  homeSectorId: string | null;
  execSectorIds: string[];
  refSectorIds: string[];
  refUserIds: string[];
  labels: { keyId: string; valueId: string }[];
}

/**
 * Resuelve el texto crudo a entidades. Reglas:
 * - `/` explícito gana sobre el contexto (FR-007); requiere canAddress (FR-038).
 * - `#`/`@` resuelven dentro del ámbito de la tarea; `@` puede ser sector o usuario (FR-041).
 * - Nombres inexistentes → conflict 409 { unresolvedTags } (FR-009).
 * - Tarea creada desde un sector lleva EXEC a ese sector (FR-038).
 */
export async function resolveTask(ctx: UserContext, input: ResolveInput): Promise<Resolved> {
  const { displayText, tags } = parseTags(input.rawText);
  const grouped = tagsBySymbol(tags);
  const unresolved: { symbol: string; name: string }[] = [];

  const contextSector = input.contextSectorId
    ? await prisma.sector.findUnique({ where: { id: input.contextSectorId } })
    : null;
  if (input.contextSectorId && !contextSector) throw notFound("Sector no encontrado");

  const contextWork = input.contextWorkId
    ? await prisma.work.findUnique({ where: { id: input.contextWorkId } })
    : null;
  if (input.contextWorkId && !contextWork) throw notFound("Trabajo no encontrado");

  // Ámbito de referencia para resolver `/trabajo` y `$etiqueta`: el del contexto donde
  // se escribe. Los sectores ya no tienen ámbito propio (catálogo global, feature 044),
  // así que un contexto de sector cae al ámbito personal del usuario.
  const contextScope: Scope = contextWork
    ? scopeOf(contextWork)
    : { groupId: null, ownerId: ctx.id };

  const scopeWhere =
    contextScope.groupId !== null
      ? { groupId: contextScope.groupId }
      : { ownerId: contextScope.ownerId ?? ctx.id };

  // --- `/trabajo`: destino explícito gana al contexto ---
  let workId: string | null = contextWork?.id ?? null;
  const workName = grouped["/"][0];
  if (workName) {
    const candidates = await prisma.work.findMany({
      where: { ...scopeWhere, status: "ACTIVE" },
    });
    const target = matchByTag(workName, candidates, (w) => w.name);
    if (!target) {
      unresolved.push({ symbol: "/", name: workName });
    } else if (!canAddress(ctx, scopeOf(target))) {
      throw forbidden(`No podés direccionar tareas hacia "${target.name}"`);
    } else {
      workId = target.id;
    }
  }

  // --- `#sector`: ejecución. Catálogo global (feature 044): el nombre es único a
  // nivel organización, así que se resuelve sobre todos los sectores sin acotar por ámbito. ---
  const sectors = await prisma.sector.findMany();
  const findSector = (name: string) => matchByTag(name, sectors, (s) => s.name);

  const execSectorIds = new Set<string>();
  for (const name of grouped["#"]) {
    const s = findSector(name);
    if (!s) unresolved.push({ symbol: "#", name });
    else execSectorIds.add(s.id);
  }
  // Tarea escrita desde un sector: EXEC al sector actual (FR-038)
  if (contextSector) execSectorIds.add(contextSector.id);

  // --- `@referencia`: sector o usuario (FR-041) ---
  const refSectorIds = new Set<string>();
  const refUserIds = new Set<string>();
  if (grouped["@"].length > 0) {
    const users = await prisma.user.findMany({ where: { globalRole: { not: "READER" } } });
    for (const name of grouped["@"]) {
      const s = findSector(name);
      if (s) {
        refSectorIds.add(s.id);
        continue;
      }
      const u = users.find(
        (x) => tagMatchesName(name, x.name) || tagMatchesName(name, x.email.split("@")[0]),
      );
      if (u) refUserIds.add(u.id);
      else unresolved.push({ symbol: "@", name });
    }
  }

  // --- `$etiqueta`: valor de etiqueta del ámbito de la tarea (globales + grupo) ---
  const labelsByKey = new Map<string, string>();
  if (grouped["$"].length > 0) {
    // Disponibilidad (feature 031): globales + las del grupo del ámbito de la tarea.
    // Mismo where que GET /api/labels (globales + grupo, sin personales acá).
    const values = await prisma.labelValue.findMany({
      where: {
        key: {
          OR: [
            { groupId: null, ownerId: null },
            ...(contextScope.groupId !== null
              ? [{ groupId: contextScope.groupId, ownerId: null }]
              : []),
          ],
        },
      },
      include: { key: true },
    });
    for (const name of grouped["$"]) {
      const matches = values.filter((v) => tagMatchesName(name, v.name));
      // Nombre presente en >1 clave → ambigüedad: mismo camino que un tag sin resolver.
      const keyIds = new Set(matches.map((v) => v.keyId));
      if (matches.length === 0 || keyIds.size > 1) {
        unresolved.push({ symbol: "$", name });
        continue;
      }
      // Match único (una sola clave): resuelto. Un valor por clave, determinístico.
      const value = matches[0];
      labelsByKey.set(value.keyId, value.id);
    }
  }

  if (unresolved.length > 0) {
    throw conflict("Hay etiquetas que no coinciden con nada existente", {
      unresolvedTags: unresolved,
    });
  }

  // Sin trabajo: queda como tarea suelta del sector de contexto (edge case spec)
  const homeSectorId = workId ? null : (contextSector?.id ?? null);
  if (!workId && !homeSectorId) {
    throw conflict("La tarea necesita un trabajo (/) o crearse dentro de un sector");
  }

  return {
    displayText,
    workId,
    homeSectorId,
    execSectorIds: [...execSectorIds],
    refSectorIds: [...refSectorIds],
    refUserIds: [...refUserIds],
    labels: [...labelsByKey].map(([keyId, valueId]) => ({ keyId, valueId })),
  };
}

interface EditMeta {
  /** Usuario que hizo la edición de texto (FR-401). */
  lastEditedById: string;
  /** Marca adoptedAt=now si corresponde (edición desde proyecto de tarea de origen SECTOR sin adoptar). */
  adopt?: boolean;
}

/**
 * Calcula la posición de inserción para una tarea nueva dentro de su scope
 * (trabajo, o sector cuando la tarea está suelta): MAX(position) + 1, o 0
 * si no hay tareas previas en ese scope.
 */
async function nextPosition(workId: string | null, homeSectorId: string | null): Promise<number> {
  const where = workId ? { workId } : { workId: null, sectorId: homeSectorId };
  const result = await prisma.task.aggregate({
    where,
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

export async function saveTask(
  ctx: UserContext,
  input: ResolveInput & { taskId?: string; editMeta?: EditMeta },
): Promise<TaskWithLinks> {
  const resolved = await resolveTask(ctx, input);
  const parsedDates = parseDates(input.rawText);
  const dueDate = parsedDates[0]?.iso ? new Date(parsedDates[0].iso) : null;

  const linksData = [
    ...resolved.execSectorIds.map((sectorId) => ({
      type: "EXEC" as const,
      targetType: "SECTOR" as const,
      targetId: sectorId,
      sectorId,
    })),
    ...resolved.refSectorIds.map((sectorId) => ({
      type: "REF" as const,
      targetType: "SECTOR" as const,
      targetId: sectorId,
      sectorId,
    })),
    ...resolved.refUserIds.map((userId) => ({
      type: "REF" as const,
      targetType: "USER" as const,
      targetId: userId,
      userId,
    })),
  ];

  const labelsData = resolved.labels.map(({ keyId, valueId }) => ({ keyId, valueId }));

  const applicableSet = await loadApplicableStatusSet(
    resolved.workId,
    resolved.homeSectorId,
    resolved.execSectorIds,
  );

  // Al editar: si el sector/trabajo cambió de forma que el estado actual ya no
  // pertenece al conjunto aplicable, reasignar por tipo (FR-015). Al crear: el
  // primer estado IN_PROGRESS del conjunto (FR-009).
  let statusId: string;
  let previousStatusId: string | null = null;
  if (input.taskId) {
    const existing = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { status: { select: { id: true, type: true } } },
    });
    if (!existing) throw notFound("Tarea no encontrada");
    previousStatusId = existing.status.id;
    statusId = reassignOnSectorChange(
      { ...existing.status, name: "", color: "", sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
      applicableSet,
    ).id;
  } else {
    statusId = initialStatus(applicableSet).id;
  }

  const task = input.taskId
    ? await prisma.task.update({
        where: { id: input.taskId },
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          statusId,
          dueDate,
          links: { deleteMany: {}, create: linksData },
          // Reconciliación (US3/FR-005/FR-007): se borran TODOS los TaskLabel de la
          // tarea y se recrean solo los resueltos del texto nuevo. Si se quitó un
          // $tag, su TaskLabel no vuelve a crearse (queda eliminado). Si se cambió
          // el valor de una clave (ej. $Alta → $Baja), resolveTask ya dedupeó por
          // keyId (Map, un valor por clave: @@id([taskId, keyId])), así que acá se
          // crea un único TaskLabel con el valor nuevo para esa clave.
          labels: { deleteMany: {}, create: labelsData },
          ...(input.editMeta && {
            lastEditedById: input.editMeta.lastEditedById,
            lastEditedAt: new Date(),
            ...(input.editMeta.adopt && { adoptedAt: new Date() }),
          }),
        },
        include: taskInclude,
      })
    : await prisma.task.create({
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          statusId,
          dueDate,
          creatorId: ctx.id,
          // Propiedad de edición (FR-401): origen según contexto de creación.
          originType: input.contextWorkId ? "WORK" : "SECTOR",
          originSectorId: input.contextWorkId ? null : (input.contextSectorId ?? null),
          links: { create: linksData },
          labels: { create: labelsData },
          position: await nextPosition(resolved.workId, resolved.homeSectorId),
        },
        include: taskInclude,
      });

  // Historial de estado (US4, FR-019): registrar el cambio si es una tarea nueva
  // (fromStatusId null) o si el estado efectivamente cambió al editar.
  if (!input.taskId || previousStatusId !== statusId) {
    await prisma.taskStatusChange.create({
      data: {
        taskId: task.id,
        fromStatusId: previousStatusId,
        toStatusId: statusId,
        changedById: ctx.id,
      },
    });
  }

  emit({
    type: "task-changed",
    taskId: task.id,
    workId: task.workId,
    sectorIds: [
      ...new Set([
        ...resolved.execSectorIds,
        ...resolved.refSectorIds,
        ...(resolved.homeSectorId ? [resolved.homeSectorId] : []),
      ]),
    ],
  });

  return task;
}

export async function getTaskOrThrow(taskId: string): Promise<TaskWithLinks> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
  if (!task) throw notFound("Tarea no encontrada");
  return task;
}

/** Historial de transiciones de estado de una tarea (US4), más reciente primero. */
export async function getTaskStatusHistory(taskId: string) {
  return prisma.taskStatusChange.findMany({
    where: { taskId },
    include: {
      fromStatus: { select: { id: true, name: true, color: true } },
      toStatus: { select: { id: true, name: true, color: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { changedAt: "desc" },
  });
}

/**
 * Cambia el estado de una tarea a cualquier estado del conjunto aplicable
 * (FR-010, sin restricción de orden). Reemplaza al viejo toggleTask() binario.
 */
export async function setTaskStatus(
  ctx: UserContext,
  taskId: string,
  statusId: string,
): Promise<TaskWithLinks> {
  const task = await getTaskOrThrow(taskId);
  const ref = await toTaskRef(task);
  if (!canToggle(ctx, ref)) {
    throw forbidden(
      "Esta tarea se completa desde su sector de ejecución (#) o su trabajo, no desde una referencia",
    );
  }

  const execSectorIds = task.links
    .filter((l) => l.type === "EXEC" && l.sectorId)
    .map((l) => l.sectorId as string);
  const applicableSet = await loadApplicableStatusSet(task.workId, task.sectorId, execSectorIds);
  const newStatus = applicableSet.find((s) => s.id === statusId);
  if (!newStatus) {
    throw conflict("Ese estado no pertenece al conjunto de estados aplicable a esta tarea");
  }

  const previousStatusId = task.statusId;
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: applyStatusChange(newStatus, ctx.id, new Date()),
    include: taskInclude,
  });

  if (previousStatusId !== statusId) {
    await prisma.taskStatusChange.create({
      data: { taskId, fromStatusId: previousStatusId, toStatusId: statusId, changedById: ctx.id },
    });
  }

  emit({
    type: "task-changed",
    taskId,
    workId: task.workId,
    sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
  return updated;
}
