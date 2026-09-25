"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskItem, type TaskDto, type TaskItemContext } from "./TaskItem";

/**
 * Fila arrastrable de la lista de tareas del proyecto (feature 052, T005/T006;
 * extraída de `works/[id]/page.tsx` con objetivos): el handle visual y el
 * estilo de "arrastrando" viven en `TaskItem` (variant "list"), acá solo se
 * conecta `useSortable` y se le pasan `attributes`/`listeners` como
 * `dragHandleProps` — así el arrastre se activa desde el ícono del handle, no
 * desde toda la fila, y clicks en checkbox/select/texto/borrar no se ven afectados.
 *
 * objetivos: `data.objectiveId` identifica la sección de la fila; si la tarea
 * arrastrada viene de OTRA sección, la fila se resalta (`task-drop-target`)
 * para avisar que soltarla ahí la cambia de objetivo.
 */
export function SortableTaskRow({
  task,
  context,
  editable,
  onChanged,
}: {
  task: TaskDto;
  context: TaskItemContext;
  editable: boolean;
  onChanged: () => void;
}) {
  const sectionId = task.objectiveId ?? null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } =
    useSortable({
      id: task.id,
      data: { objectiveId: sectionId },
    });
  /**
   * Zona de anidado (062-subtareas): además de ser ordenable, cada fila raíz es
   * un destino donde soltar OTRA tarea para colgarla como subtarea. El id lleva
   * el prefijo `nest:` para que el orquestador distinga las dos intenciones —
   * soltar entre filas reordena, soltar sobre esta zona anida. Una subtarea no
   * es destino: el anidado es de un solo nivel.
   */
  const { setNodeRef: setNestRef, isOver: isNestTarget } = useDroppable({
    id: `nest:${task.id}`,
    disabled: !editable || !!task.parentId,
  });

  const activeSection = active?.data.current?.objectiveId as string | null | undefined;
  const crossSectionTarget =
    isOver && !isDragging && activeSection !== undefined && activeSection !== sectionId;

  return (
    <div
      ref={setNodeRef}
      className={`task-sortable-row${crossSectionTarget ? " task-drop-target" : ""}`}
      // Rows can have different heights; dragging must translate without resizing their content.
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        touchAction: "none",
      }}
    >
      <div ref={setNestRef} className={isNestTarget ? "task-nest-target" : undefined}>
        <TaskItem
          task={task}
          context={context}
          canToggle={editable}
          onChanged={onChanged}
          dragHandleProps={{ attributes, listeners }}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}
