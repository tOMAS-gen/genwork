"use client";

import { useState } from "react";
import { Search, LayoutGrid, List, ArrowUpDown } from "@/components/ui/icons";

export interface DashboardFilters {
  text: string;
  sectorId: string;
  labelValueId: string;
  status: string;
  /** Grupos seleccionados para filtrar (US3, FR-010): multi-select, [] = todos. */
  groupIds: string[];
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  text: "",
  sectorId: "",
  labelValueId: "",
  status: "",
  groupIds: [],
};

type ViewMode = "grid" | "list";
type SortBy = "recent" | "name" | "progress";

export interface GroupOption {
  id: string;
  name: string;
}

interface FilterBarProps {
  sectors: { id: string; name: string }[];
  labelKeys: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  /** Grupos visibles para el usuario (US3, FR-010), ya cargados en el dashboard. */
  groups: GroupOption[];
  onFilterChange: (filters: DashboardFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
}

export function FilterBar({
  sectors,
  labelKeys,
  groups,
  onFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: FilterBarProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_DASHBOARD_FILTERS);

  function update(partial: Partial<DashboardFilters>) {
    const next = { ...filters, ...partial };
    setFilters(next);
    onFilterChange(next);
  }

  function toggleGroup(groupId: string) {
    const active = filters.groupIds.includes(groupId);
    update({
      groupIds: active
        ? filters.groupIds.filter((id) => id !== groupId)
        : [...filters.groupIds, groupId],
    });
  }

  function clearFilters() {
    setFilters(EMPTY_DASHBOARD_FILTERS);
    onFilterChange(EMPTY_DASHBOARD_FILTERS);
  }

  const hasActiveFilters =
    !!filters.text ||
    !!filters.sectorId ||
    !!filters.labelValueId ||
    !!filters.status ||
    filters.groupIds.length > 0;

  const activeLabelColor =
    labelKeys.find((l) => l.valueId === filters.labelValueId)?.color ?? null;

  const sectorLabel = filters.sectorId
    ? sectors.find((s) => s.id === filters.sectorId)?.name ?? "Todos los sectores"
    : "Todos los sectores";
  const activeLabel = labelKeys.find((l) => l.valueId === filters.labelValueId);
  const labelLabel = activeLabel ? `${activeLabel.keyName}: ${activeLabel.valueName}` : "Todas las etiquetas";
  const statusLabel =
    { pending: "Pendiente", in_progress: "En progreso", completed: "Completado" }[filters.status] ??
    "Todos los estados";

  return (
    <div className="filter-bar">
      <div className="toolbar-left">
        <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 10, color: "var(--muted)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={filters.text}
            onChange={(e) => update({ text: e.target.value })}
            style={{ paddingLeft: 32, width: "100%" }}
          />
        </div>
      </div>

      <div className="toolbar-center">
        <label className={`filter-pill${filters.sectorId ? " is-active" : ""}`}>
          <span className="filter-pill-label">{sectorLabel}</span>
          <select
            aria-label="Filtrar por sector"
            value={filters.sectorId}
            onChange={(e) => update({ sectorId: e.target.value })}
          >
            <option value="">Todos los sectores</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`filter-pill${filters.labelValueId ? " is-active" : ""}`}>
          {activeLabelColor && (
            <span className="filter-pill-dot" style={{ background: activeLabelColor }} aria-hidden="true" />
          )}
          <span className="filter-pill-label">{labelLabel}</span>
          <select
            aria-label="Filtrar por etiqueta"
            value={filters.labelValueId}
            onChange={(e) => update({ labelValueId: e.target.value })}
          >
            <option value="">Todas las etiquetas</option>
            {labelKeys.map((l) => (
              <option key={l.valueId} value={l.valueId}>
                {l.keyName}: {l.valueName}
              </option>
            ))}
          </select>
        </label>

        <label className={`filter-pill${filters.status ? " is-active" : ""}`}>
          <span className="filter-pill-label">{statusLabel}</span>
          <select
            aria-label="Filtrar por estado"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completado</option>
          </select>
        </label>

        {groups.length > 0 && (
          <div role="group" aria-label="Filtrar por grupo" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {groups.map((group) => {
              const active = filters.groupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`filter-pill filter-pill-toggle${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleGroup(group.id)}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        )}

        {hasActiveFilters && (
          <button type="button" className="filter-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="toolbar-right">
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === "grid" ? "active" : ""}
            aria-label="Ver como grilla"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            aria-label="Ver como lista"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <List size={16} />
          </button>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <ArrowUpDown size={14} style={{ position: "absolute", left: 10, color: "var(--muted)", pointerEvents: "none" }} />
          <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortBy)} style={{ paddingLeft: 30 }}>
            <option value="recent">Recientes</option>
            <option value="name">Nombre</option>
            <option value="progress">Progreso</option>
          </select>
        </div>
      </div>
    </div>
  );
}
