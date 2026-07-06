"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { FilterBar, type FilterState } from "@/components/filters/FilterBar";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";

interface SectorView {
  sector: { id: string; name: string; color: string | null; group: { id: string; name: string } | null };
  loose: TaskDto[];
  byWork: { work: { id: string; name: string; status: string }; tasks: TaskDto[] }[];
  refs: TaskDto[];
  metrics: { total: number; done: number };
  level: "read" | "operate";
}

/**
 * Vista de sector (US3): tareas de ejecución completables + apartado Referencias
 * (FR-040, solo lectura) + filtros combinables (US4) + creación con /trabajo (FR-012).
 */
export default function SectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<SectorView | null>(null);
  usePageTitle(view?.sector.name ?? null);
  const [filters, setFilters] = useState<FilterState>({ workId: "", refSectorId: "", state: "" });
  const [works, setWorks] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (filters.workId) qs.set("workId", filters.workId);
    if (filters.refSectorId) qs.set("refSectorId", filters.refSectorId);
    if (filters.state) qs.set("state", filters.state);
    void api<SectorView>(`/api/sectors/${id}/tasks?${qs}`).then(setView).catch(() => {});
  }, [id, filters]);

  useEffect(load, [load]);
  useEffect(() => {
    void api<{ id: string; name: string }[]>("/api/works").then(setWorks).catch(() => {});
    void api<{ id: string; name: string }[]>("/api/sectors").then(setSectors).catch(() => {});
  }, []);
  useLiveRefresh(load, { sectorId: id });

  if (!view) {
    return (
      <div className="sheet">
        <Skeleton variant="text" height="28px" width="30%" />
        <div style={{ marginTop: "var(--space-2)" }}>
          <Skeleton variant="card" width="100%" height="40px" />
        </div>
        <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-1)" }}>
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <Skeleton variant="text" height="22px" width="40%" />
        </div>
        <div style={{ marginTop: "var(--space-1)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: "var(--space-1)" }}>
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canOperate = view.level === "operate";

  const removeSector = async () => {
    try {
      await api(`/api/sectors/${id}`, { method: "DELETE" });
    } catch (err) {
      const body = (err as { body?: { error?: { affectedTasks?: number; looseTasks?: number; message?: string } } })
        .body;
      const msg = body?.error?.message ?? (err as Error).message;
      if (confirm(`${msg}\n\n¿Eliminar el sector igualmente?`)) {
        await api(`/api/sectors/${id}?confirm=true`, { method: "DELETE" });
        router.push("/sectors");
      }
    }
  };

  return (
    <div className="sheet">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>#{view.sector.name}</h1>
        {canOperate && (
          <button className="btn" onClick={() => void removeSector()}>
            Eliminar sector
          </button>
        )}
      </div>

      {canOperate && (
        <TaskListEditor context={{ sectorId: id }} onCreated={load} />
      )}

      <FilterBar filters={filters} onChange={setFilters} works={works} sectors={sectors} />

      <h2>Tareas del sector</h2>
      {view.loose.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          context={{ sectorId: id }}
          canToggle={canOperate}
          onChanged={load}
        />
      ))}
      {view.byWork.map((group) => (
        <div key={group.work.id} style={{ marginTop: "var(--space-2)" }}>
          <h3 className="muted" style={{ fontSize: "0.85rem", marginBottom: "var(--space-1)" }}>
            {group.work.name}
          </h3>
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              context={{ sectorId: id }}
              canToggle={canOperate}
              onChanged={load}
            />
          ))}
        </div>
      ))}
      {view.loose.length === 0 && view.byWork.length === 0 && (
        <p className="muted">Sin tareas con los filtros actuales.</p>
      )}

      {view.refs.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>Referencias</h2>
          <p className="muted">
            Tareas de otros sectores que necesitan aporte de #{view.sector.name}; se completan en
            su sector de ejecución.
          </p>
          {view.refs.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              context={{ sectorId: id }}
              canToggle={false}
              onChanged={load}
            />
          ))}
        </>
      )}
    </div>
  );
}
