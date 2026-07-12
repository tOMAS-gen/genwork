"use client";

import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";

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
 */
export function TaskBoardView({ tasks, context, canToggle, onChanged }: TaskBoardViewProps) {
  const columnsMap = new Map<string, { id: string; name: string; color: string; sortOrder: number }>();
  for (const t of tasks) {
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
        const colTasks = tasks.filter((t) => t.status.id === col.id);
        return (
          <div key={col.id} className="task-board-column" style={{ borderColor: col.color }}>
            <div className="task-board-column-header">
              <span>{col.name}</span>
              <span className="task-board-column-count">{colTasks.length}</span>
            </div>
            <div className="task-board-column-body">
              {colTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  context={context}
                  canToggle={canToggle}
                  onChanged={onChanged}
                  variant="board"
                />
              ))}
              {colTasks.length === 0 && <p className="muted task-board-column-empty">Sin tareas</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
