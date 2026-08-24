"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowUpDown, Inbox, LayoutGrid, List, Plus, Search } from "@/components/ui/icons";
import { SectorCard, type SectorCardData } from "@/components/sectors/SectorCard";
import { CreateSectorDialog } from "@/components/sectors/CreateSectorDialog";
import {
  groupSectorsByScope,
  sectionDomId,
  type SectorSection,
  type SectorSortKey,
} from "@/components/sectors/groupSectorsByScope";
import {
  SectorSectionHeader,
  SECTION_HEADER_BUTTON_CLASS,
} from "@/components/sectors/SectorSectionHeader";
import { usePageTitle } from "@/lib/usePageTitle";

type ViewMode = "grid" | "list";

/** Columnas de la tabla en modo lista; mantener en sincronía con el `<thead>`. */
const TABLE_COLS = 3;

/**
 * Estado plegado de las secciones (feature 060). Se persiste el conjunto de
 * secciones CERRADAS, no el de abiertas: así una sección desconocida — un grupo
 * nuevo, o la primera visita — no figura en la lista y arranca abierta, que es
 * el default correcto. Con el conjunto inverso, todo grupo nuevo nacería
 * colapsado y el usuario no lo vería.
 */
const COLLAPSED_KEY = "gw:sectors-sections-collapsed";

function readCollapsed(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === "string");
  } catch {
    return [];
  }
}

function writeCollapsed(keys: Set<string>, knownKeys: string[]) {
  try {
    // Poda: solo se guardan secciones que todavía existen, para que la clave no
    // crezca indefinidamente con grupos borrados.
    const known = new Set(knownKeys);
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...keys].filter((k) => known.has(k))));
  } catch {
    /* modo privado o storage lleno: el plegado sigue funcionando en memoria */
  }
}

/** Listado de sectores (US1): crear sector lo puede hacer SUPERADMIN o un admin de grupo (FR de 044-sectores-globales). */
export function SectorsView({
  canCreate,
  adminGroups,
  isSuperAdmin,
  groupColors = {},
}: {
  canCreate: boolean;
  adminGroups: { id: string; name: string }[];
  isSuperAdmin: boolean;
  groupColors?: Record<string, string | null>;
}) {
  usePageTitle("Sectores");
  const router = useRouter();
  const [sectors, setSectors] = useState<SectorCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<SectorSortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Plegado manual, persistido. `collapsedInSearch` es el equivalente efímero
  // que gobierna mientras hay un filtro activo, para que buscar no ensucie el
  // estado que el usuario dejó armado.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedInSearch, setCollapsedInSearch] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    void api<SectorCardData[]>("/api/sectors")
      .then(setSectors)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Se lee después del montaje (nunca durante el render) para no romper la
  // hidratación: el primer paint muestra todo abierto y luego colapsa, igual que
  // ya hace el drawer con su propio estado.
  useEffect(() => {
    setCollapsed(new Set(readCollapsed()));
  }, []);

  const query = searchText.trim().toLowerCase();
  const isSearching = query.length > 0;

  // Cada cambio de búsqueda reabre todo: las secciones que coinciden tienen que
  // verse sin un click extra.
  useEffect(() => {
    setCollapsedInSearch(new Set());
  }, [query]);

  const sections = useMemo(() => {
    const filtered = query ? sectors.filter((s) => s.name.toLowerCase().includes(query)) : sectors;
    return groupSectorsByScope(filtered, sort);
  }, [sectors, query, sort]);

  const isOpen = useCallback(
    (key: string) => !(isSearching ? collapsedInSearch : collapsed).has(key),
    [isSearching, collapsedInSearch, collapsed],
  );

  const toggle = useCallback(
    (key: string) => {
      const apply = (prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      };
      if (isSearching) {
        setCollapsedInSearch(apply);
        return;
      }
      setCollapsed((prev) => {
        const next = apply(prev);
        writeCollapsed(next, sections.map((s) => s.key));
        return next;
      });
    },
    [isSearching, sections],
  );

  const allCollapsed = sections.length > 0 && sections.every((s) => !isOpen(s.key));

  const toggleAll = useCallback(() => {
    const next = allCollapsed ? new Set<string>() : new Set(sections.map((s) => s.key));
    if (isSearching) {
      setCollapsedInSearch(next);
      return;
    }
    setCollapsed(next);
    writeCollapsed(next, sections.map((s) => s.key));
  }, [allCollapsed, sections, isSearching]);

  const goToSector = useCallback((id: string) => router.push(`/sectors/${id}`), [router]);

  const renderHeaderButton = (section: SectorSection, open: boolean) => (
    <button
      type="button"
      onClick={() => toggle(section.key)}
      aria-expanded={open}
      aria-controls={sectionDomId(section.key)}
      className={SECTION_HEADER_BUTTON_CLASS}
    >
      <SectorSectionHeader
        section={section}
        open={open}
        color={section.groupId ? groupColors[section.groupId] : null}
      />
    </button>
  );

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
            {sections.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex min-h-11 items-center rounded-[4px] border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:bg-[var(--hover-soft)] hover:text-text"
              >
                {allCollapsed ? "Expandir todo" : "Contraer todo"}
              </button>
            )}

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
                onChange={(e) => setSort(e.target.value as SectorSortKey)}
                aria-label="Ordenar sectores"
                className="min-h-11 rounded-[4px] border border-border bg-surface py-2 pl-7 pr-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="name">Nombre A-Z</option>
                <option value="pending">Más pendientes</option>
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
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted">No hay sectores que coincidan con el filtro.</p>
      ) : viewMode === "grid" ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => {
            const open = isOpen(section.key);
            const panelId = sectionDomId(section.key);
            return (
              <section key={section.key} aria-label={section.title}>
                {renderHeaderButton(section, open)}
                <div id={panelId} className={open ? "mt-3" : undefined}>
                  {open && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
                      {section.sectors.map((s) => (
                        <SectorCard key={s.id} sector={s} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Sector</th>
                <th className="px-4 py-2 font-medium">Progreso</th>
                <th className="px-4 py-2 font-medium">Tareas</th>
              </tr>
            </thead>

            {/* Dos <tbody> por sección: el primero lleva el encabezado y el
                segundo — el que apunta aria-controls — las filas. Un <tbody>
                vacío es HTML válido, así que se monta siempre aunque la sección
                esté plegada. */}
            {sections.map((section) => {
              const open = isOpen(section.key);
              const bodyId = sectionDomId(section.key);
              return (
                <Fragment key={section.key}>
                  <tbody>
                    <tr>
                      <th colSpan={TABLE_COLS} scope="colgroup" className="p-0">
                        {renderHeaderButton(section, open)}
                      </th>
                    </tr>
                  </tbody>
                  <tbody id={bodyId}>
                    {open &&
                      section.sectors.map((s) => {
                        const pct =
                          s.metrics.total > 0 ? Math.round((s.metrics.done / s.metrics.total) * 100) : 0;
                        return (
                          <tr
                            key={s.id}
                            role="link"
                            tabIndex={0}
                            onClick={() => goToSector(s.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                goToSector(s.id);
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
                </Fragment>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}
