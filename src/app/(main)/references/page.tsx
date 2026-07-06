"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AtSign } from "@/components/ui/icons";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";

export default function ReferencesPage() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void api<TaskDto[]>("/api/me/references?state=PENDING")
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; workId: string | null; tasks: TaskDto[] }>();
    for (const task of tasks) {
      const key = task.work?.id ?? "__sin-proyecto__";
      const name = task.work?.name ?? "Sin proyecto";
      if (!map.has(key)) map.set(key, { name, workId: task.work?.id ?? null, tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

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
              <section key={group.workId ?? "sin-proyecto"}>
                <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-2)" }}>
                  {group.workId ? (
                    <Link href={`/works/${group.workId}`} style={{ color: "inherit" }}>
                      {group.name}
                    </Link>
                  ) : (
                    group.name
                  )}
                </h2>
                {group.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    context={{}}
                    canToggle={false}
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
