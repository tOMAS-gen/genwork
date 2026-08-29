import { prisma } from "@/lib/db/client";
import { progress } from "@/lib/domain/works/progress";
import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

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

export interface PortalWorkDetail extends PortalWorkSummary {
  tasks: PortalTaskDto[];
  doc: { content: unknown } | null;
}

/** Solo proyectos activos y no plantilla llegan al portal (FR-015). */
const PORTAL_WORK_FILTER = { status: "ACTIVE", isTemplate: false } as const;

const LABEL_INCLUDE = { value: { include: { key: true } } } as const;

function toLabelDtos(
  labels: readonly { isPrimary: boolean; value: { name: string; color: string } }[],
): PortalLabelDto[] {
  return labels.map((l) => ({
    valueName: l.value.name,
    color: l.value.color,
    isPrimary: l.isPrimary,
  }));
}

function countDone(tasks: readonly { status: { type: string } }[]): number {
  return tasks.filter((t) => t.status.type === "FINAL").length;
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
        where: { parentId: null },
        orderBy: { position: "asc" },
        select: {
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
          subtasks: {
            orderBy: { position: "asc" },
            select: {
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
            },
          },
        },
      },
    },
  });
  if (!work) return null;

  // 062-subtareas: un padre-contenedor no suma; sus hijas (ya anidadas en
  // `task.subtasks`) aportan en su lugar (ver unfinishedCount.ts).
  let total = 0;
  let done = 0;
  for (const t of work.tasks) {
    const subtasks = t.subtasks ?? [];
    if (isContainerTask({ subtaskCount: subtasks.length })) {
      total += subtasks.length;
      done += countDone(subtasks);
    } else {
      total += 1;
      if (t.status.type === "FINAL") done += 1;
    }
  }

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
    tasks: work.tasks.map(toPortalTaskDto),
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
