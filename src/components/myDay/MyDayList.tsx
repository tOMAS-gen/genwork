"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AtSign, Sun } from "@/components/ui/icons";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { myDayProgress, myDaySourceLabel } from "@/lib/domain/tasks/myDayProgress";
import { mergeMyDayAndReferences } from "./mergeMyDayAndReferences";

type MyDayTask = TaskDto & { canToggle: boolean; canManageMyDay: boolean };

/**
 * Lista continua: Mi día en orden de agregado, seguido de las referencias.
 * El progreso cuenta solo Mi día; cada fila conserva su origen y permisos.
 */
export function MyDayAndReferencesList() {
  const [data, setData] = useState<{ myDay: MyDayTask[]; references: TaskDto[] }>({
    myDay: [],
    references: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    void Promise.all([
      api<MyDayTask[]>("/api/me/my-day"),
      api<TaskDto[]>("/api/me/references?type=IN_PROGRESS"),
    ])
      .then(([myDay, references]) => {
        setData({ myDay, references });
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const progress = useMemo(() => myDayProgress(data.myDay), [data.myDay]);
  const tasks = useMemo(() => mergeMyDayAndReferences(data.myDay, data.references), [data]);

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

  if (tasks.length === 0 && !error) {
    return (
      <EmptyState
        icon={Sun}
        title="No tenés tareas para hoy ni referencias pendientes"
        description="Las tareas que agreguen a Mi día y las que te mencionen con @ aparecerán juntas acá."
      />
    );
  }

  return (
    <div className="my-day">
      {error && (
        <p className="my-day-progress" role="alert">
          No pudimos actualizar tus tareas.{" "}
          <button type="button" className="btn" onClick={load}>
            Reintentar
          </button>
        </p>
      )}
      {data.myDay.length > 0 && (
        <p className="my-day-progress" aria-live="polite">
          <Sun size={14} aria-hidden="true" />
          <span>
            Mi día:{" "}
            <strong>
              {progress.done} de {progress.total}
            </strong>{" "}
            completadas hoy
          </span>
        </p>
      )}
      {tasks.length > 0 && (
        <ol className="reference-panel my-day-list" aria-label="Mi día y referencias">
          {tasks.map(({ task, isMyDay, isReference }) => {
            const source = myDaySourceLabel(task);
            const href = task.work
              ? `/works/${task.work.id}`
              : task.homeSector
                ? `/sectors/${task.homeSector.id}`
                : null;
            return (
              <li key={task.id} className="my-day-row">
                <div className="my-day-row-meta">
                  <span className="my-day-kind">
                    {isMyDay ? (
                      <Sun size={14} aria-hidden="true" />
                    ) : (
                      <AtSign size={14} aria-hidden="true" />
                    )}
                    {isMyDay ? "Mi día" : "Referencia"}
                    {isMyDay && isReference && <span className="muted">· Referencia</span>}
                  </span>
                  {source &&
                    (href ? (
                      <Link className="my-day-source muted" href={href}>
                        {source}
                      </Link>
                    ) : (
                      <span className="my-day-source muted">{source}</span>
                    ))}
                </div>
                <TaskItem
                  task={task}
                  context={{ suppressObjectiveChip: true, suppressWorkTag: true }}
                  canToggle={task.canToggle ?? false}
                  onChanged={load}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
