"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { TaskInput } from "@/components/tasks/TaskInput";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { FilterBar, type FilterState } from "@/components/filters/FilterBar";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";

interface SectorView {
  sector: { id: string; name: string };
  exec: TaskDto[];
  refs: TaskDto[];
  level: "read" | "operate";
}

/**
 * Vista de sector (US3): tareas de ejecución completables + apartado Referencias
 * (FR-040, solo lectura) + filtros combinables (US4) + creación con /trabajo (FR-012).
 */
export default function SectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<SectorView | null>(null);
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

  if (!view) return <p className="muted">Cargando…</p>;

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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>#{view.sector.name}</h1>
        {canOperate && (
          <button className="btn" onClick={() => void removeSector()}>
            Eliminar sector
          </button>
        )}
      </div>

      {canOperate && (
        <TaskInput context={{ sectorId: id }} onCreated={load} />
      )}

      <FilterBar filters={filters} onChange={setFilters} works={works} sectors={sectors} />

      <h2>Tareas del sector</h2>
      {view.exec.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          context={{ sectorId: id }}
          canToggle={canOperate}
          onChanged={load}
        />
      ))}
      {view.exec.length === 0 && <p className="muted">Sin tareas con los filtros actuales.</p>}

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
