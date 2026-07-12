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

/** Listado de sectores (US1): crear sector lo puede hacer SUPERADMIN o un admin de grupo (FR de 044-sectores-globales). */
export function SectorsView({
  canCreate,
  adminGroups,
  isSuperAdmin,
}: {
  canCreate: boolean;
  adminGroups: { id: string; name: string }[];
  isSuperAdmin: boolean;
}) {
  usePageTitle("Sectores");
  const [sectors, setSectors] = useState<SectorCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
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

  const filtered = useMemo(() => {
    let list = sectors;

    const text = searchText.trim().toLowerCase();
    if (text) {
      list = list.filter((s) => s.name.toLowerCase().includes(text));
    }

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "tasks") return b.metrics.total - a.metrics.total;
      const pctA = a.metrics.total > 0 ? a.metrics.done / a.metrics.total : 0;
      const pctB = b.metrics.total > 0 ? b.metrics.done / b.metrics.total : 0;
      return pctB - pctA;
    });

    return list;
  }, [sectors, searchText, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="m-0 text-2xl text-text">Sectores</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            title="Crear un sector"
            aria-label="Crear un sector"
            className="inline-flex items-center justify-center rounded-full border border-accent bg-accent py-2 px-3 text-white transition hover:[box-shadow:var(--shadow-md)] hover:brightness-110 active:scale-[0.98]"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <CreateSectorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
        canCreate={canCreate}
        adminGroups={adminGroups}
        isSuperAdmin={isSuperAdmin}
      />

      {sectors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search size={16} className="pointer-events-none absolute left-2.5 text-muted" />
            <input
              type="text"
              placeholder="Buscar sectores..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-[4px] border border-border bg-surface py-2 pl-8 pr-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                aria-label="Ver como grilla"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 py-1.5 transition ${
                  viewMode === "grid"
                    ? "bg-accent text-white"
                    : "bg-surface text-text hover:bg-[var(--hover-soft)]"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                aria-label="Ver como lista"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 py-1.5 transition ${
                  viewMode === "list"
                    ? "bg-accent text-white"
                    : "bg-surface text-text hover:bg-[var(--hover-soft)]"
                }`}
              >
                <List size={16} />
              </button>
            </div>

            <div className="relative flex items-center">
              <ArrowUpDown size={14} className="pointer-events-none absolute left-2.5 text-muted" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-h-11 rounded-[4px] border border-border bg-surface py-2 pl-7 pr-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="name">Nombre A-Z</option>
                <option value="tasks">Más tareas</option>
                <option value="progress">Mayor progreso</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          <Skeleton variant="card" height="140px" />
          <Skeleton variant="card" height="140px" />
          <Skeleton variant="card" height="140px" />
        </div>
      ) : sectors.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin sectores todavía"
          description="Creá tu primer sector para agrupar tareas y proyectos por área de trabajo."
          action={canCreate ? { label: "Nuevo sector", onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">No hay sectores que coincidan con el filtro.</p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {filtered.map((s) => (
            <SectorCard key={s.id} sector={s} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Sector</th>
                <th className="px-4 py-2 font-medium">Ámbito</th>
                <th className="px-4 py-2 font-medium">Progreso</th>
                <th className="px-4 py-2 font-medium">Tareas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const pct = s.metrics.total > 0 ? Math.round((s.metrics.done / s.metrics.total) * 100) : 0;
                const scopeLabel =
                  s.scope.type === "GROUP"
                    ? s.scope.groupName ?? ""
                    : s.scope.type === "PERSONAL"
                      ? "Personal"
                      : "Global";
                return (
                  <tr
                    key={s.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => (window.location.href = `/sectors/${s.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        window.location.href = `/sectors/${s.id}`;
                      }
                    }}
                    className="cursor-pointer border-b border-border transition last:border-0 hover:bg-accent-soft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.color && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                        )}
                        <strong className="font-semibold text-text">{s.name}</strong>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-[var(--hover-soft)] px-2 py-0.5 text-xs font-semibold tracking-[0.03em] text-text"
                        title={`Ámbito: ${scopeLabel}`}
                      >
                        {scopeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.metrics.total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 max-w-[100px] flex-1 overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-muted">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted">
                        {s.metrics.done}/{s.metrics.total}
                      </span>
                    </td>
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
