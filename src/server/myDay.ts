import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { forbidden } from "@/server/api";
import { emit } from "@/server/events";
import {
  canManageMyDay,
  canToggle,
  taskAccess,
  type UserContext,
} from "@/lib/domain/permissions";
import {
  execSectorIdsOf,
  getTaskOrThrow,
  loadApplicableStatusSet,
  statusOptionDto,
  toTaskRef,
} from "@/server/tasks";
import { TASK_IN_ACTIVE_PROJECT_OR_LOOSE } from "@/server/workFilters";
import { taskRefFromLoadedTask, type TaskWithPermissionData } from "@/server/loadedTask";
import { calDateInTz, getSystemTimezone, zonedTimeToUtc } from "@/lib/time/system-tz";
import type { TaskDto } from "@/components/tasks/TaskItem";

/**
 * Mi día: marca global "para hacer hoy", sin fecha (estilo Microsoft To Do).
 * La marca vive en la tarea (`myDayAt`), no por usuario: una tarea marcada
 * aparece en "Mi día" de todo el que puede verla. La ponen/quitan solo quienes
 * administran el ámbito de la tarea (`canManageMyDay`).
 */

/** Pone (`inMyDay: true`) o quita la tarea de Mi día. Idempotente. */
export async function setTaskMyDay(ctx: UserContext, taskId: string, inMyDay: boolean) {
  const task = await getTaskOrThrow(taskId);
  if (!canManageMyDay(ctx, await toTaskRef(task))) {
    throw forbidden("Solo quien administra el proyecto o sector puede cambiar Mi día");
  }

  const already = task.myDayAt !== null;
  if (already === inMyDay) return { id: task.id, myDayAt: task.myDayAt };

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: inMyDay ? { myDayAt: new Date(), myDayById: ctx.id } : { myDayAt: null, myDayById: null },
    select: { id: true, myDayAt: true },
  });

  emit({
    type: "task-changed",
    taskId,
    workId: task.workId,
    sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
  return updated;
}

/**
 * Instante de inicio del día de hoy en la zona `tz`. Las completadas desde
 * este instante siguen en la lista (el admin ve qué se cumplió); las de antes
 * desaparecen solas al día siguiente.
 */
export function startOfTodayInTz(now: Date, tz: string): Date {
  const today = calDateInTz(now, tz);
  return zonedTimeToUtc(
    { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate(), hour: 0, minute: 0 },
    tz,
  );
}

const permissionInclude = {
  links: {
    include: {
      sector: { include: { group: { select: { publicRead: true } } } },
      user: { select: { id: true, name: true } },
    },
  },
  work: { include: { group: { select: { id: true, name: true, publicRead: true } } } },
  homeSector: { include: { group: { select: { id: true, name: true, publicRead: true } } } },
  labels: { include: { value: { include: { key: true } } } },
  status: true,
  objective: { select: { id: true, title: true } },
} satisfies Prisma.TaskInclude;

const myDayInclude = {
  ...permissionInclude,
  parent: { select: { id: true, displayText: true } },
  subtasks: { orderBy: { position: "asc" }, include: permissionInclude },
} satisfies Prisma.TaskInclude;

type LoadedTask = TaskWithPermissionData & {
  parentId: string | null;
  dueDate: Date | null;
  myDayAt: Date | null;
};

export type MyDayTaskDto = TaskDto & {
  canToggle: boolean;
  canManageMyDay: boolean;
  myDayAt: string | null;
};

async function toMyDayDto(
  ctx: UserContext,
  task: LoadedTask,
  extra: { parentText: string | null; subtasks: MyDayTaskDto[]; subtaskCount: number; subtaskDone: number },
): Promise<MyDayTaskDto> {
  const ref = taskRefFromLoadedTask(task);
  const statusOptions = await loadApplicableStatusSet(task.workId, task.sectorId, execSectorIdsOf(task.links));
  const groupOf = (g: { id: string; name: string } | null | undefined) => (g ? { id: g.id, name: g.name } : null);
  return {
    id: task.id,
    rawText: task.rawText,
    displayText: task.displayText,
    status: task.status,
    statusOptions: statusOptions.map(statusOptionDto),
    workId: task.workId,
    work: task.work
      ? { id: task.work.id, name: task.work.name, status: task.work.status, group: groupOf(task.work.group) }
      : null,
    originType: task.originType,
    adoptedAt: task.adoptedAt ? task.adoptedAt.toISOString() : null,
    homeSector: task.homeSector
      ? { id: task.homeSector.id, name: task.homeSector.name, group: groupOf(task.homeSector.group) }
      : null,
    labels: task.labels.map((l) => ({
      keyId: l.keyId,
      keyName: l.value.key.name,
      valueId: l.valueId,
      valueName: l.value.name,
      color: l.value.color,
    })),
    links: task.links.map((l) => ({
      type: l.type,
      targetType: l.targetType,
      sector: l.sector ? { id: l.sector.id, name: l.sector.name, group: null } : null,
      user: l.user,
    })),
    description: task.description,
    parentId: task.parentId,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    objectiveId: task.objectiveId,
    objective: task.objective,
    myDayAt: task.myDayAt ? task.myDayAt.toISOString() : null,
    canToggle: canToggle(ctx, ref),
    canManageMyDay: canManageMyDay(ctx, ref),
    ...extra,
  };
}

/**
 * Lista de Mi día del usuario: tareas marcadas que puede ver, en orden de
 * agregado. Pendientes siempre; terminadas solo si se completaron hoy. Una
 * subtarea marcada cuyo padre también está marcado no se repite suelta: ya
 * aparece anidada bajo él.
 */
export async function listMyDay(ctx: UserContext, now: Date = new Date()): Promise<MyDayTaskDto[]> {
  const startOfToday = startOfTodayInTz(now, await getSystemTimezone());
  const rows = await prisma.task.findMany({
    where: {
      myDayAt: { not: null },
      AND: [
        TASK_IN_ACTIVE_PROJECT_OR_LOOSE,
        { OR: [{ status: { type: "IN_PROGRESS" } }, { completedAt: { gte: startOfToday } }] },
      ],
    },
    include: myDayInclude,
    orderBy: { myDayAt: "asc" },
  });

  const visible = rows.filter(
    (t) => taskAccess(ctx, taskRefFromLoadedTask(t as unknown as TaskWithPermissionData)) !== "none",
  );
  const listedIds = new Set(visible.map((t) => t.id));

  return Promise.all(
    visible
      .filter((t) => !(t.parentId && listedIds.has(t.parentId)))
      .map(async (t) => {
        const subtasks = await Promise.all(
          t.subtasks.map((s) =>
            toMyDayDto(ctx, s as unknown as LoadedTask, {
              parentText: t.displayText,
              subtasks: [],
              subtaskCount: 0,
              subtaskDone: 0,
            }),
          ),
        );
        return toMyDayDto(ctx, t as unknown as LoadedTask, {
          parentText: t.parent?.displayText ?? null,
          subtasks,
          subtaskCount: subtasks.length,
          subtaskDone: subtasks.filter((s) => s.status.type === "FINAL").length,
        });
      }),
  );
}
