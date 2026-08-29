import type { Prisma } from "@prisma/client";
import { loadApplicableStatusSet, execSectorIdsOf, statusOptionDto } from "@/server/tasks";

/**
 * 062-subtareas: shape base compartida por padre e hija (una subtarea no puede
 * tener sus propias subtareas, así que solo hace falta un nivel de `include`).
 *
 * Extraído de `works/[id]/route.ts` (revisión de Tarea 11, hallazgo Importante
 * A): cualquier endpoint que le pise el estado a la página de proyecto con una
 * lista de tareas (works/[id], el reorder de tareas) tiene que devolver EL
 * MISMO contrato — raíces con `parentId: null`, hijas anidadas en `subtasks`,
 * `parentText`/`subtaskCount`/`subtaskDone` — o la UI se rompe con un mismatch
 * silencioso entre lo que esperaba `TaskDto` y lo que llegó.
 */
export const taskWithParentInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  homeSector: { select: { id: true, name: true } },
  work: { select: { id: true, name: true } },
  labels: { include: { value: { include: { key: true } } } },
  status: true,
  parent: { select: { id: true, displayText: true } },
} satisfies Prisma.TaskInclude;

/** Include completo para el nivel raíz: agrega la relación `subtasks` (un solo nivel). */
export const rootTaskWithSubtasksInclude = {
  ...taskWithParentInclude,
  subtasks: { orderBy: { position: "asc" }, include: taskWithParentInclude },
} satisfies Prisma.TaskInclude;

export type ChildTaskRow = Prisma.TaskGetPayload<{ include: typeof taskWithParentInclude }>;

/** DTO final de una tarea, con `subtasks` recursivo (mismo shape para padre e hija). */
export type WorkTaskDto = Omit<ChildTaskRow, "labels" | "parent"> & {
  parentText: string | null;
  statusOptions: ReturnType<typeof statusOptionDto>[];
  labels: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  subtasks: WorkTaskDto[];
  subtaskCount: number;
  subtaskDone: number;
};

/**
 * Serializa una tarea al DTO del contrato — el MISMO mapper para el padre y sus
 * hijas (para que `TaskItem` las renderice igual): agrega `parentText`,
 * `statusOptions`, aplana `labels` y anida `subtasks` (recursión de un solo
 * nivel: las hijas se llaman con `subtasks: []` porque no pueden tener las suyas).
 */
export async function toTaskDto(task: ChildTaskRow, subtaskRows: ChildTaskRow[] = []): Promise<WorkTaskDto> {
  const { labels: taskLabels, parent, ...rest } = task;
  const applicable = await loadApplicableStatusSet(
    task.workId,
    task.sectorId,
    execSectorIdsOf(task.links),
  );
  const subtasks = await Promise.all(subtaskRows.map((s) => toTaskDto(s)));
  return {
    ...rest,
    parentText: parent?.displayText ?? null,
    statusOptions: applicable.map(statusOptionDto),
    labels: taskLabels.map((l) => ({
      keyId: l.keyId,
      keyName: l.value.key.name,
      valueId: l.valueId,
      valueName: l.value.name,
      color: l.value.color,
    })),
    subtasks,
    subtaskCount: subtasks.length,
    subtaskDone: subtasks.filter((s) => s.status.type === "FINAL").length,
  };
}
