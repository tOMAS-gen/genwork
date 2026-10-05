"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AtSign, Sun } from "@/components/ui/icons";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import { groupReferencesBySource } from "@/components/tasks/groupReferencesBySource";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { MyDayList } from "@/components/myDay/MyDayList";

type Tab = "mi-dia" | "referencias";

/**
 * Apartado personal: "Mi día" (lo principal, pestaña por defecto) y "Mis
 * referencias". `?tab=referencias` abre directo la segunda.
 */
export default function ReferencesPage() {
  return (
    <Suspense fallback={null}>
      <ReferencesPageContent />
    </Suspense>
  );
}

function ReferencesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "referencias" ? "referencias" : "mi-dia";
  usePageTitle(tab === "mi-dia" ? "Mi día" : "Mis referencias");

  const setTab = (next: Tab) => {
    router.replace(next === "mi-dia" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };

  return (
    <div className="sheet">
      <PageHeader
        title={tab === "mi-dia" ? "Mi día" : "Mis referencias"}
        description={
          tab === "mi-dia"
            ? "Lo que hay que hacer hoy, elegido por quien administra cada proyecto o sector."
            : "Tareas de otros que necesitan tu aporte (@vos)."
        }
        icon={tab === "mi-dia" ? "myDay" : "references"}
      />

      <ProjectTabs
        panelId="personal-content"
        ariaLabel="Mi día y referencias"
        items={[
          { key: "mi-dia", label: "Mi día", icon: Sun },
          { key: "referencias", label: "Referencias", icon: AtSign },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      <div
        id="personal-content"
        role="tabpanel"
        aria-labelledby={`personal-content-tab-${tab}`}
        style={{ marginTop: "var(--space-4)" }}
      >
        {tab === "mi-dia" ? <MyDayList /> : <ReferencesPanel />}
      </div>
    </div>
  );
}

function ReferencesPanel() {
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

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton variant="text" height="24px" width="30%" />
        <Skeleton variant="text" height="40px" />
        <Skeleton variant="text" height="40px" />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton variant="text" height="24px" width="30%" />
        </div>
        <Skeleton variant="text" height="40px" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={AtSign}
        title="No tenés referencias pendientes"
        description="Cuando alguien te mencione con @ en una tarea pendiente, aparecerá acá."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {groups.map((group) => (
        <section key={group.key} className="reference-panel">
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
  );
}
