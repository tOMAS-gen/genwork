"use client";

import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { parentBreadcrumb } from "@/components/tasks/SubtaskList";

interface TaskBoardViewProps {
  tasks: TaskDto[];
  context: { workId?: string; sectorId?: string };
  canToggle: boolean;
  onChanged: () => void;
}

/**
 * Vista de tablero (feature 042, US3): una columna por estado del conjunto
 * aplicable, con las mismas tarjetas de tarea que la lista. Mover una tarea de
 * columna = elegir el estado de esa columna en su propio selector (research.md
 * D3: sin drag-and-drop, misma interacción que la lista/detalle).
 *
 * 062-subtareas (Tarea 13): `tasks` llega con las hijas anidadas bajo su padre
 * (mismo contrato que la lista, `task.subtasks`) — pero en el tablero cada
 * hija es una tarjeta PROPIA en la columna de SU PROPIO estado, no la de su
 * padre (una hija puede estar "Hecha" mientras el padre sigue "Pendiente").
 * Se aplanan padres + hijas antes de repartir por columna; cada tarjeta se
 * identifica sola con `parentBreadcrumb` cuando cuelga de otra.
 */
export function TaskBoardView({ tasks, context, canToggle, onChanged }: TaskBoardViewProps) {
  const flatTasks = tasks.flatMap((t) => [t, ...(t.subtasks ?? [])]);

  const columnsMap = new Map<string, { id: string; name: string; color: string; sortOrder: number }>();
  for (const t of flatTasks) {
    for (const s of t.statusOptions) {
      if (!columnsMap.has(s.id)) columnsMap.set(s.id, s);
    }
  }
  const columns = [...columnsMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  if (columns.length === 0) {
    return <p className="muted">Todavía no hay tareas para mostrar en el tablero.</p>;
  }

  return (
    <div className="task-board">
      {columns.map((col) => {
        const colTasks = flatTasks.filter((t) => t.status.id === col.id);
        return (
          <div key={col.id} className="task-board-column" style={{ borderColor: col.color }}>
            <div className="task-board-column-header">
              <span>{col.name}</span>
              <span className="task-board-column-count">{colTasks.length}</span>
            </div>
            <div className="task-board-column-body">
              {colTasks.map((task) => {
                const breadcrumb = parentBreadcrumb({
                  parentId: task.parentId ?? null,
                  parentText: task.parentText ?? null,
                });
                return (
                  <div key={task.id} className="task-board-card">
                    <TaskItem
                      task={task}
                      context={context}
                      canToggle={canToggle}
                      onChanged={onChanged}
                      variant="board"
                    />
                    {breadcrumb && <p className="muted task-board-breadcrumb">{breadcrumb}</p>}
                  </div>
                );
              })}
              {colTasks.length === 0 && <p className="muted task-board-column-empty">Sin tareas</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
