"use client";

import { useCallback } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { showToast } from "@/components/ui/Toast";
import type { TaskDto } from "@/components/tasks/TaskItem";
import { applyDragIntent, resolveTaskDrop, type DropSection } from "./taskDrag";
import { moveTaskToObjective, reorderSectionTasks, setTaskParent, type ObjectiveDto } from "./objectiveApi";

/**
 * objetivos: arrastre de la lista del proyecto (un solo `DndContext`). La
 * decisión es pura (`resolveTaskDrop`); este hook solo aplica el optimismo,
 * llama a la API y vuelve atrás si falla.
 * - Misma sección → reorder de esa sección (`objectiveId`), la respuesta
 *   reemplaza la lista.
 * - Otra sección → `PATCH /api/tasks/[id] {objectiveId, index}`, recarga y
 *   despliega la sección destino.
 * - `nest:` → colgar de otra tarea, como antes de objetivos.
 */
export function useProjectTaskDnd({
  workId,
  tasks,
  sections,
  objectives,
  canMoveBetweenSections,
  setTasks,
  onReload,
  onExpand,
}: {
  workId: string;
  /** Raíces actuales (la foto a la que se vuelve si la API falla). */
  tasks: TaskDto[];
  sections: DropSection[];
  objectives: ObjectiveDto[];
  /** Cambiar de sección exige operar el proyecto (`canManageObjectives`). */
  canMoveBetweenSections: boolean;
  setTasks: (update: (prev: TaskDto[]) => TaskDto[]) => void;
  onReload: () => void;
  onExpand: (objectiveId: string) => void;
}) {
  // PointerSensor con umbral para que un click no inicie un arrastre;
  // KeyboardSensor para accesibilidad (feature 052).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      // Soltó en la mitad de abajo de la fila destino → va después.
      const translated = active.rect.current.translated;
      const after = !!translated && translated.top > over.rect.top + over.rect.height / 2;
      const intent = resolveTaskDrop(sections, String(active.id), String(over.id), { after });
      if (intent.kind === "none") return;

      if (intent.kind === "nest") {
        setTaskParent(intent.taskId, intent.parentId)
          .then(onReload)
          .catch((err) => {
            showToast({ message: (err as Error).message });
            onReload();
          });
        return;
      }

      if (intent.kind === "move" && !canMoveBetweenSections) {
        showToast({ message: "Para cambiar una tarea de objetivo tenés que poder editar el proyecto" });
        return;
      }

      const previous = tasks;
      setTasks(() => applyDragIntent(previous, intent, objectives));
      const rollback = (err: unknown) => {
        setTasks(() => previous);
        const status = (err as { status?: number }).status;
        showToast({
          message:
            status === 409
              ? "El orden cambió mientras se movía la tarea; se actualizó la lista"
              : (err as Error).message,
        });
        onReload();
      };

      if (intent.kind === "reorder") {
        reorderSectionTasks(workId, intent.objectiveId, intent.orderedTaskIds)
          .then((fresh) => setTasks(() => fresh))
          .catch(rollback);
        return;
      }

      moveTaskToObjective(intent.taskId, intent.toObjectiveId, intent.index)
        .then(() => {
          if (intent.toObjectiveId) onExpand(intent.toObjectiveId);
          onReload();
        })
        .catch(rollback);
    },
    [tasks, sections, objectives, canMoveBetweenSections, setTasks, onReload, onExpand, workId],
  );

  return { sensors, handleDragEnd };
}
