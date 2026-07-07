"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowUpDown, Inbox, LayoutGrid, List, Plus, Search } from "@/components/ui/icons";
import { SectorCard, type SectorCardData } from "@/components/sectors/SectorCard";
import { CreateSectorDialog } from "@/components/sectors/CreateSectorDialog";
import { usePageTitle } from "@/lib/usePageTitle";

type ViewMode = "grid" | "list";
type SortKey = "name" | "progress" | "tasks";

export default function SectorsPage() {
  usePageTitle("Sectores");
  const [sectors, setSectors] = useState<SectorCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const load = () => {
    setLoading(true);
    void api<SectorCardData[]>("/api/sectors")
      .then(setSectors)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sectors) {
      if (s.group) map.set(s.group.id, s.group.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sectors]);

  const filtered = useMemo(() => {
    let list = sectors;

    const text = searchText.trim().toLowerCase();
    if (text) {
      list = list.filter((s) => s.name.toLowerCase().includes(text));
    }

    if (groupFilter === "personal") {
      list = list.filter((s) => !s.groupId);
    } else if (groupFilter) {
      list = list.filter((s) => s.groupId === groupFilter);
    }

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "tasks") return b.metrics.total - a.metrics.total;
      const pctA = a.metrics.total > 0 ? a.metrics.done / a.metrics.total : 0;
      const pctB = b.metrics.total > 0 ? b.metrics.done / b.metrics.total : 0;
      return pctB - pctA;
    });

    return list;
  }, [sectors, searchText, groupFilter, sort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Sectores</h1>
        <button
          className="btn btn-primary"
          onClick={() => setDialogOpen(true)}
          title="Crear un sector"
          aria-label="Crear un sector"
          style={{ padding: "8px 12px" }}
        >
          <Plus size={20} />
        </button>
      </div>

      <CreateSectorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />

      {sectors.length > 0 && (
        <div className="filter-bar">
          <div className="toolbar-left">
            <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
              <Search
                size={16}
                style={{ position: "absolute", left: 10, color: "var(--muted)", pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="Buscar sectores..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ paddingLeft: 32, width: "100%" }}
              />
            </div>
          </div>

          <div className="toolbar-center">
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">Todos los grupos</option>
              <option value="personal">Personal</option>
              {groups.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-right">
            <div className="view-toggle">
              <button
                type="button"
                className={viewMode === "grid" ? "active" : ""}
                aria-label="Ver como grilla"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "active" : ""}
                aria-label="Ver como lista"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
              </button>
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <ArrowUpDown size={14} style={{ position: "absolute", left: 10, color: "var(--muted)", pointerEvents: "none" }} />
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ paddingLeft: 30 }}>
                <option value="name">Nombre A-Z</option>
                <option value="tasks">Más tareas</option>
                <option value="progress">Mayor progreso</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="project-grid">
          <Skeleton variant="card" height="140px" />
          <Skeleton variant="card" height="140px" />
          <Skeleton variant="card" height="140px" />
        </div>
      ) : sectors.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin sectores todavía"
          description="Creá tu primer sector para agrupar tareas y proyectos por área de trabajo."
          action={{ label: "Nuevo sector", onClick: () => setDialogOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <p className="muted">No hay sectores que coincidan con el filtro.</p>
      ) : viewMode === "grid" ? (
        <div className="project-grid">
          {filtered.map((s) => (
            <SectorCard key={s.id} sector={s} />
          ))}
        </div>
      ) : (
        <div className="table-scroll-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Sector</th>
                <th>Grupo</th>
                <th>Progreso</th>
                <th>Tareas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const pct = s.metrics.total > 0 ? Math.round((s.metrics.done / s.metrics.total) * 100) : 0;
                return (
                  <tr key={s.id} onClick={() => window.location.href = `/sectors/${s.id}`} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        {s.color && <span className="project-dot color-dot" style={{ "--c": s.color } as React.CSSProperties} />}
                        <strong>{s.name}</strong>
                      </div>
                    </td>
                    <td><span className="muted">{s.group ? s.group.name : "Personal"}</span></td>
                    <td>
                      {s.metrics.total > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <div className="pc-progress-track" style={{ flex: 1, maxWidth: 100 }}>
                            <div className="pc-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="muted" style={{ fontSize: "var(--text-sm)" }}>{pct}%</span>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td><span className="muted">{s.metrics.done}/{s.metrics.total}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
