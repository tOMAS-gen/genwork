"use client";

import { useId, useRef, useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  X,
} from "@/components/ui/icons";

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
  labelKeys: {
    keyId: string;
    keyName: string;
    valueId: string;
    valueName: string;
    color: string;
  }[];
  /** Grupos visibles para el usuario (US3, FR-010), ya cargados en el dashboard. */
  groups: GroupOption[];
  onFilterChange: (filters: DashboardFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  resultCount: number;
  loading?: boolean;
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
  resultCount,
  loading = false,
}: FilterBarProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_DASHBOARD_FILTERS);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function update(partial: Partial<DashboardFilters>) {
    const next = { ...filters, ...partial };
    setFilters(next);
    onFilterChange(next);
  }

  function toggleGroup(groupId: string) {
    update({
      groupIds: filters.groupIds.includes(groupId)
        ? filters.groupIds.filter((id) => id !== groupId)
        : [...filters.groupIds, groupId],
    });
  }

  function clearFilters() {
    setFilters(EMPTY_DASHBOARD_FILTERS);
    onFilterChange(EMPTY_DASHBOARD_FILTERS);
  }

  const activeLabel = labelKeys.find((label) => label.valueId === filters.labelValueId);
  const activeFilters = [
    ...(filters.sectorId
      ? [
          {
            key: "sector",
            label: `Sector: ${sectors.find((sector) => sector.id === filters.sectorId)?.name ?? "Seleccionado"}`,
            remove: () => update({ sectorId: "" }),
          },
        ]
      : []),
    ...(filters.labelValueId
      ? [
          {
            key: "label",
            label: activeLabel
              ? `${activeLabel.keyName}: ${activeLabel.valueName}`
              : "Etiqueta seleccionada",
            remove: () => update({ labelValueId: "" }),
          },
        ]
      : []),
    ...(filters.status
      ? [
          {
            key: "status",
            label:
              { pending: "Pendiente", in_progress: "En progreso", completed: "Completado" }[
                filters.status
              ] ?? filters.status,
            remove: () => update({ status: "" }),
          },
        ]
      : []),
    ...filters.groupIds.map((id) => ({
      key: `group-${id}`,
      label: `Grupo: ${groups.find((group) => group.id === id)?.name ?? "Seleccionado"}`,
      remove: () => toggleGroup(id),
    })),
  ];
  const hasFilters = !!filters.text || activeFilters.length > 0;

  return (
    <section className="project-toolbar" aria-label="Buscar, filtrar y ordenar proyectos">
      <div className="project-toolbar-main">
        <div className="project-search">
          <Search size={20} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar proyectos"
            placeholder="Buscar proyectos..."
            value={filters.text}
            onChange={(event) => update({ text: event.target.value })}
          />
          {filters.text && (
            <button
              type="button"
              className="project-search-clear"
              aria-label="Borrar búsqueda"
              onClick={() => {
                update({ text: "" });
                searchRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          ref={filterTrigger}
          type="button"
          className="project-filter-trigger"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          Filtros
          {activeFilters.length > 0 && (
            <span className="project-filter-count">{activeFilters.length}</span>
          )}
        </button>

        <label className="project-sort">
          <ArrowUpDown size={18} aria-hidden="true" />
          <span className="project-sort-label">Ordenar</span>
          <select
            aria-label="Ordenar proyectos"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as SortBy)}
          >
            <option value="recent">Más recientes</option>
            <option value="name">Nombre · A–Z</option>
            <option value="progress">Mayor avance</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>

        <div className="project-view-switch" role="group" aria-label="Vista de proyectos">
          <button
            type="button"
            aria-label="Ver como grilla"
            title="Grilla"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Ver como lista"
            title="Lista"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <List size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        id={panelId}
        hidden={!expanded}
        className="project-filter-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setExpanded(false);
            filterTrigger.current?.focus();
          }
        }}
      >
        <div className="project-filter-fields">
          <label className="project-filter-field">
            <span>Sector</span>
            <select
              aria-label="Filtrar por sector"
              value={filters.sectorId}
              onChange={(event) => update({ sectorId: event.target.value })}
            >
              <option value="">Todos los sectores</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </label>
          <label className="project-filter-field">
            <span>Etiqueta</span>
            <select
              aria-label="Filtrar por etiqueta"
              value={filters.labelValueId}
              onChange={(event) => update({ labelValueId: event.target.value })}
            >
              <option value="">Todas las etiquetas</option>
              {labelKeys.map((label) => (
                <option key={label.valueId} value={label.valueId}>
                  {label.keyName}: {label.valueName}
                </option>
              ))}
            </select>
          </label>
          <label className="project-filter-field">
            <span>Estado</span>
            <select
              aria-label="Filtrar por estado"
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completado</option>
            </select>
          </label>
        </div>
        {groups.length > 0 && (
          <fieldset className="project-filter-groups">
            <legend>
              Grupos <span>Podés elegir más de uno</span>
            </legend>
            <div>
              {groups.map((group) => (
                <label key={group.id}>
                  <input
                    type="checkbox"
                    checked={filters.groupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="project-toolbar-summary">
        <span className="project-result-count" role="status" aria-live="polite" aria-atomic="true">
          {loading
            ? "Cargando proyectos…"
            : `${resultCount} ${resultCount === 1 ? "proyecto" : "proyectos"}`}
        </span>
        {activeFilters.length > 0 && (
          <div className="project-active-filters" aria-label="Filtros activos">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.remove}
                aria-label={`Quitar filtro: ${filter.label}`}
                title={`Quitar filtro: ${filter.label}`}
              >
                <span>{filter.label}</span>
                <X size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {hasFilters && (
          <button type="button" className="project-filters-reset" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}
