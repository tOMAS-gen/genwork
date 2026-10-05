"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sun } from "@/components/ui/icons";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { myDayProgress, myDaySourceLabel } from "@/lib/domain/tasks/myDayProgress";

type MyDayTask = TaskDto & { canToggle: boolean; canManageMyDay: boolean };

/**
 * Mi día: tareas marcadas "para hoy" por quien administra el proyecto/sector,
 * en orden de agregado. Cada fila dice de dónde viene (proyecto › objetivo ›
 * tarea padre) porque la lista mezcla ámbitos. Las completadas hoy quedan
 * tachadas hasta medianoche para que se vea qué se cumplió.
 */
export function MyDayList() {
  const [tasks, setTasks] = useState<MyDayTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void api<MyDayTask[]>("/api/me/my-day")
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const progress = useMemo(() => myDayProgress(tasks), [tasks]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton variant="text" height="20px" width="25%" />
        <Skeleton variant="text" height="40px" />
        <Skeleton variant="text" height="40px" />
        <Skeleton variant="text" height="40px" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Sun}
        title="No hay tareas para hoy"
        description="Cuando quien administra un proyecto o sector agregue tareas a Mi día (☀), aparecen acá."
      />
    );
  }

  return (
    <div className="my-day">
      <p className="my-day-progress" aria-live="polite">
        <strong>
          {progress.done} de {progress.total}
        </strong>{" "}
        completadas hoy
      </p>
      <section className="reference-panel my-day-list">
        {tasks.map((task) => {
          const source = myDaySourceLabel(task);
          const href = task.work ? `/works/${task.work.id}` : task.homeSector ? `/sectors/${task.homeSector.id}` : null;
          return (
            <div key={task.id} className="my-day-row">
              {source &&
                (href ? (
                  <Link className="my-day-source muted" href={href}>
                    {source}
                  </Link>
                ) : (
                  <span className="my-day-source muted">{source}</span>
                ))}
              <TaskItem
                task={task}
                context={{ suppressObjectiveChip: true }}
                canToggle={task.canToggle}
                onChanged={load}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
