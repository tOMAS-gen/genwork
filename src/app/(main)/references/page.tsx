"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AtSign } from "@/components/ui/icons";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import { groupReferencesBySource } from "@/components/tasks/groupReferencesBySource";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";

export default function ReferencesPage() {
  usePageTitle("Mis referencias");
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void api<TaskDto[]>("/api/me/references?type=IN_PROGRESS")
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const groups = useMemo(() => groupReferencesBySource(tasks), [tasks]);

  return (
    <div className="sheet">
      <h1 className="sheet-title">Mis referencias</h1>
      <p className="sheet-desc">Tareas de otros que necesitan tu aporte (@vos).</p>

      <div style={{ marginTop: "var(--space-4)" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Skeleton variant="text" height="24px" width="30%" />
            <Skeleton variant="text" height="40px" />
            <Skeleton variant="text" height="40px" />
            <div style={{ marginTop: "var(--space-3)" }}>
              <Skeleton variant="text" height="24px" width="30%" />
            </div>
            <Skeleton variant="text" height="40px" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={AtSign}
            title="No tenés referencias pendientes"
            description="Cuando alguien te mencione con @ en una tarea pendiente, aparecerá acá."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {groups.map((group) => (
              <section key={group.key}>
                {group.header.type === "work" ? (
                  <TaskGroupHeader work={group.header.work} />
                ) : (
                  <TaskGroupHeader sector={group.header.sector} />
                )}
                {group.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    context={{}}
                    canToggle={task.canToggle ?? false}
                    onChanged={load}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
