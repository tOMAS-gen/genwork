import { prisma } from "@/lib/db/client";
import { progress } from "@/lib/domain/works/progress";
import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";
import { ACTIVE_PROJECT_WORK } from "@/server/workFilters";
import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import { objectiveTaskCounts, type TaskCounts } from "@/lib/domain/objectives/progress";

/**
 * Capa de datos del portal de cliente (feature 059).
 *
 * Namespace propio y proyecciones dedicadas, no la respuesta interna filtrada:
 * la respuesta de /api/works/[id] arrastra ruta de carpeta en la nube, código
 * interno, grupo, adjuntos y nivel de acceso. Un modo dual obligaría a auditar
 * campo por campo una respuesta compartida cada vez que alguien agrega un include.
 * Esto es una allowlist de forma, y hay tests que verifican la ausencia de los
 * campos prohibidos (FR-021).
 */

export interface PortalLabelDto {
  valueName: string;
  color: string;
  isPrimary: boolean;
}

export interface PortalWorkSummary {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  stage: { name: string; color: string | null } | null;
  labels: PortalLabelDto[];
  taskCounts: { done: number; total: number };
  pct: number;
}

export interface PortalTaskDto {
  id: string;
  displayText: string;
  rawText: string;
  description: string | null;
  dueDate: Date | null;
  position: number;
  status: { name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    name: string;
    color: string | null;
  }[];
  labels: { valueName: string; color: string }[];
  /** 062-subtareas: id de la tarea padre, o null si es de nivel raíz. */
  parentId: string | null;
  /** 062-subtareas: `displayText` del padre, o null (misma tarea sin padre). */
  parentText: string | null;
  /** 062-subtareas: hijas anidadas, serializadas con el MISMO mapper que el padre. */
  subtasks: PortalTaskDto[];
  subtaskCount: number;
  subtaskDone: number;
}

/**
 * objetivos (D11): un objetivo tal como lo ve el cliente. Allowlist explícita:
 * sin `workId`, `position`, `sourceTemplateId`, `createdById` ni `createdAt`
 * (organización interna). `taskCounts` sigue la regla de contenedor, igual
 * que el total del proyecto.
 */
export interface PortalObjectiveDto {
  id: string;
  title: string;
  description: string | null;
  taskCounts: TaskCounts;
  pct: number;
  tasks: PortalTaskDto[];
}

export interface PortalWorkDetail extends PortalWorkSummary {
  /** objetivos: solo las tareas GENERALES (sin objetivo); las demás van en `objectives[].tasks`. */
  tasks: PortalTaskDto[];
  /** objetivos: en orden (`position`); `[]` si el proyecto no tiene. */
  objectives: PortalObjectiveDto[];
  doc: { content: unknown } | null;
}

/**
 * Solo proyectos activos y no plantilla llegan al portal (FR-015). Es el mismo
 * filtro con el que el administrador de grupo elige qué asignar (objetivos,
 * higiene de plantillas): lo asignable y lo visible no pueden divergir.
 */
const PORTAL_WORK_FILTER = ACTIVE_PROJECT_WORK;

const LABEL_INCLUDE = { value: { include: { key: true } } } as const;

/** objetivos: allowlist de campos del objetivo que pueden llegar al cliente. */
const PORTAL_OBJECTIVE_SELECT = { id: true, title: true, description: true } as const;

/**
 * 062-subtareas (hallazgo Importante 6 de revisión): shape compartida por
 * padre e hija (una subtarea no puede tener sus propias subtareas, así que
 * este mismo `select` sirve para ambos niveles — el padre lo usa con
 * `subtasks` agregado, ver `getPortalWork`). Antes estaba copiado dos veces.
 */
const PORTAL_TASK_SELECT = {
  id: true,
  displayText: true,
  rawText: true,
  description: true,
  dueDate: true,
  position: true,
  parentId: true,
  parent: { select: { id: true, displayText: true } },
  status: { select: { name: true, color: true, type: true } },
  links: {
    select: {
      type: true,
      targetType: true,
      sector: { select: { name: true, color: true } },
      user: { select: { name: true } },
    },
  },
  labels: { include: LABEL_INCLUDE },
} as const;

function toLabelDtos(
  labels: readonly { isPrimary: boolean; value: { name: string; color: string } }[],
): PortalLabelDto[] {
  return labels.map((l) => ({
    valueName: l.value.name,
    color: l.value.color,
    isPrimary: l.isPrimary,
  }));
}

/**
 * 062-subtareas: un padre con hijas es contenedor y no suma nada al avance del
 * proyecto — ni a total, ni a done —; sus hijas ya viajan como filas propias en
 * el mismo `tasks` (heredan el `workId` del padre), así que alcanza con
 * saltear al contenedor (ver src/lib/domain/tasks/unfinishedCount.ts).
 */
function countTasksAsContainers(
  tasks: readonly { status: { type: string }; _count: { subtasks: number } }[],
): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    if (isContainerTask({ subtaskCount: t._count?.subtasks ?? 0 })) continue;
    total += 1;
    if (t.status.type === "FINAL") done += 1;
  }
  return { total, done };
}

/** Listado de proyectos otorgados a un cliente (FR-015). */
export async function listClientWorks(userId: string): Promise<PortalWorkSummary[]> {
  const grants = await prisma.clientWorkGrant.findMany({
    where: { userId, work: PORTAL_WORK_FILTER },
    select: {
      work: {
        select: {
          id: true,
          name: true,
          description: true,
          dueDate: true,
          stage: { select: { name: true, color: true } },
          labels: { include: LABEL_INCLUDE },
          tasks: {
            select: { status: { select: { type: true } }, _count: { select: { subtasks: true } } },
          },
        },
      },
    },
  });

  return grants
    .map(({ work }) => {
      const { total, done } = countTasksAsContainers(work.tasks);
      return {
        id: work.id,
        name: work.name,
        description: work.description,
        dueDate: work.dueDate,
        stage: work.stage,
        labels: toLabelDtos(work.labels),
        taskCounts: { done, total },
        pct: progress(done, total)?.pct ?? 0,
      };
    })
    .sort(byDueDateThenName);
}

/** Sin fecha de entrega van al final: lo urgente arriba (Principio I). */
function byDueDateThenName(a: PortalWorkSummary, b: PortalWorkSummary): number {
  if (a.dueDate && b.dueDate) {
    const diff = a.dueDate.getTime() - b.dueDate.getTime();
    if (diff !== 0) return diff;
  } else if (a.dueDate !== b.dueDate) {
    return a.dueDate ? -1 : 1;
  }
  return a.name.localeCompare(b.name, "es");
}

/**
 * Detalle de un proyecto para el portal (FR-016/FR-017).
 *
 * Devuelve null si el proyecto está archivado o es plantilla: el otorgamiento se
 * conserva, pero deja de ser visible. El llamador lo traduce a 404.
 */
export async function getPortalWork(workId: string): Promise<PortalWorkDetail | null> {
  const work = await prisma.work.findFirst({
    where: { id: workId, ...PORTAL_WORK_FILTER },
    select: {
      id: true,
      name: true,
      description: true,
      dueDate: true,
      stage: { select: { name: true, color: true } },
      labels: { include: LABEL_INCLUDE },
      doc: { select: { content: true } },
      tasks: {
        // 062-subtareas: las hijas viajan anidadas bajo su padre (subtasks),
        // no sueltas a nivel raíz del listado.
        // objetivos: `position` es por sección, así que `createdAt` desempata
        // (mismo criterio que works/[id]); el agrupado conserva este orden.
        where: { parentId: null },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          ...PORTAL_TASK_SELECT,
          // objetivos: solo en la raíz y solo para agrupar; `toPortalTaskDto`
          // mapea campo por campo, así que no llega al cliente. Las hijas
          // cuentan en el objetivo de su raíz (D14).
          objectiveId: true,
          subtasks: { orderBy: { position: "asc" }, select: PORTAL_TASK_SELECT },
        },
      },
      objectives: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: PORTAL_OBJECTIVE_SELECT,
      },
    },
  });
  if (!work) return null;

  // objetivos (D11): generales + una sección por objetivo. Un `objectiveId`
  // desconocido cae en generales: la tarea nunca desaparece del portal.
  const grouped = groupTasksByObjective(work.tasks, work.objectives);
  const general = grouped.general.map(toPortalTaskDto);
  const objectives: PortalObjectiveDto[] = grouped.sections.map(({ objective, tasks }) => {
    const dtos = tasks.map(toPortalTaskDto);
    const counts = objectiveTaskCounts(dtos);
    return {
      id: objective.id,
      title: objective.title,
      description: objective.description,
      taskCounts: counts,
      pct: progress(counts.done, counts.total)?.pct ?? 0,
      tasks: dtos,
    };
  });

  // 062-subtareas: un padre-contenedor no suma; sus hijas (ya anidadas en
  // `subtasks`) aportan en su lugar. Misma regla (`taskListProgress`) que la
  // página de proyecto; el total es la suma de generales + objetivos.
  const { done, total } = objectiveTaskCounts([...general, ...objectives.flatMap((o) => o.tasks)]);

  return {
    id: work.id,
    name: work.name,
    description: work.description,
    dueDate: work.dueDate,
    stage: work.stage,
    labels: toLabelDtos(work.labels),
    taskCounts: { done, total },
    pct: progress(done, total)?.pct ?? 0,
    doc: work.doc ? { content: work.doc.content } : null,
    tasks: general,
    objectives,
  };
}

/**
 * Serializa una tarea al DTO del portal — el MISMO mapper para el padre y sus
 * hijas (062-subtareas): agrega `parentText` y anida `subtasks` (recursión de
 * un solo nivel: las hijas se llaman sin subtareas propias).
 */
function toPortalTaskDto(task: {
  id: string;
  displayText: string;
  rawText: string;
  description: string | null;
  dueDate: Date | null;
  position: number;
  parentId: string | null;
  parent: { id: string; displayText: string } | null;
  status: { name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    sector: { name: string; color: string | null } | null;
    user: { name: string } | null;
  }[];
  labels: { value: { name: string; color: string } }[];
  subtasks?: Omit<Parameters<typeof toPortalTaskDto>[0], "subtasks">[];
}): PortalTaskDto {
  const subtasks = (task.subtasks ?? []).map((s) => toPortalTaskDto(s));
  return {
    id: task.id,
    displayText: task.displayText,
    rawText: task.rawText,
    description: task.description,
    dueDate: task.dueDate,
    position: task.position,
    status: task.status,
    parentId: task.parentId,
    parentText: task.parent?.displayText ?? null,
    subtasks,
    subtaskCount: subtasks.length,
    subtaskDone: subtasks.filter((s) => s.status.type === "FINAL").length,
    // El cliente ve sectores ejecutores y personas referenciadas tal como se ven
    // internamente (FR-017): la decisión de producto es no anonimizar.
    links: task.links.map((l) => ({
      type: l.type,
      targetType: l.targetType,
      name: l.sector?.name ?? l.user?.name ?? "",
      color: l.sector?.color ?? null,
    })),
    labels: task.labels.map((l) => ({ valueName: l.value.name, color: l.value.color })),
  };
}

export interface PortalActivityEntry {
  id: string;
  taskId: string;
  taskText: string;
  from: { name: string; color: string } | null;
  to: { name: string; color: string } | null;
  at: Date;
}

/**
 * Historial de cambios de estado de las tareas de un proyecto (FR-024, US4).
 *
 * "Actividad" acá es esto y no el feed interno del proyecto, que registra acciones
 * de asistentes MCP: para un cliente esos nombres de herramientas son ruido y
 * exponen detalle de operación interna sin responder "cómo va el proyecto".
 *
 * Sin el nombre de quien hizo el cambio: no le aporta al cliente y expone la
 * asignación interna de trabajo con más detalle del necesario.
 */
export async function getPortalActivity(
  workId: string,
  { take, cursor }: { take: number; cursor?: string },
): Promise<{ entries: PortalActivityEntry[]; nextCursor: string | null }> {
  const rows = await prisma.taskStatusChange.findMany({
    where: { task: { workId } },
    orderBy: { changedAt: "desc" },
    take: take + 1, // uno de más para saber si hay página siguiente
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      changedAt: true,
      task: { select: { id: true, displayText: true } },
      fromStatus: { select: { name: true, color: true } },
      toStatus: { select: { name: true, color: true } },
    },
  });

  const page = rows.slice(0, take);
  return {
    entries: page.map((r) => ({
      id: r.id,
      taskId: r.task.id,
      taskText: r.task.displayText,
      from: r.fromStatus,
      to: r.toStatus,
      at: r.changedAt,
    })),
    nextCursor: rows.length > take ? (page.at(-1)?.id ?? null) : null,
  };
}

/** Proyectos otorgados a un cliente, para filtrar el flujo de eventos en vivo. */
export async function grantedWorkIds(userId: string): Promise<Set<string>> {
  const grants = await prisma.clientWorkGrant.findMany({
    where: { userId },
    select: { workId: true },
  });
  return new Set(grants.map((g) => g.workId));
}
