"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "@/components/ui/icons";
import type { SectorSortKey } from "./groupSectorsByScope";

interface SectorToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  scope: string;
  onScopeChange: (value: string) => void;
  scopes: { key: string; title: string }[];
  sort: SectorSortKey;
  onSortChange: (value: SectorSortKey) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
  resultCount: number;
  loading: boolean;
  canToggleAll: boolean;
  allCollapsed: boolean;
  onToggleAll: () => void;
}

export function SectorToolbar({
  searchText,
  onSearchChange,
  scope,
  onScopeChange,
  scopes,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  loading,
  canToggleAll,
  allCollapsed,
  onToggleAll,
}: SectorToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const activeScope = scopes.find((item) => item.key === scope);

  return (
    <section className="project-toolbar" aria-label="Buscar, filtrar y ordenar sectores">
      <div className="project-toolbar-main">
        <div className="project-search">
          <Search size={20} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar sectores"
            placeholder="Buscar sectores..."
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchText && (
            <button
              type="button"
              className="project-search-clear"
              aria-label="Borrar búsqueda"
              onClick={() => {
                onSearchChange("");
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
          {scope && <span className="project-filter-count">1</span>}
        </button>
        <label className="project-sort">
          <ArrowUpDown size={18} aria-hidden="true" />
          <span className="project-sort-label">Ordenar</span>
          <select
            aria-label="Ordenar sectores"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SectorSortKey)}
          >
            <option value="name">Nombre · A–Z</option>
            <option value="pending">Más pendientes</option>
            <option value="tasks">Más tareas</option>
            <option value="progress">Mayor avance</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <div className="project-view-switch" role="group" aria-label="Vista de sectores">
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
            <span>Grupo o ámbito</span>
            <select
              aria-label="Filtrar por grupo o ámbito"
              value={scope}
              onChange={(event) => onScopeChange(event.target.value)}
            >
              <option value="">Todos los sectores</option>
              {scopes.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="project-toolbar-summary">
        <span className="project-result-count" role="status" aria-live="polite" aria-atomic="true">
          {loading
            ? "Cargando sectores…"
            : `${resultCount} ${resultCount === 1 ? "sector" : "sectores"}`}
        </span>
        {activeScope && (
          <div className="project-active-filters" aria-label="Filtros activos">
            <button
              type="button"
              onClick={() => onScopeChange("")}
              aria-label={`Quitar filtro: ${activeScope.title}`}
              title={`Quitar filtro: ${activeScope.title}`}
            >
              <span>{activeScope.title}</span>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="sector-summary-actions">
          {(searchText || scope) && (
            <button
              type="button"
              className="project-filters-reset"
              onClick={() => {
                onSearchChange("");
                onScopeChange("");
              }}
            >
              Limpiar filtros
            </button>
          )}
          {canToggleAll && (
            <button type="button" className="project-filters-reset" onClick={onToggleAll}>
              {allCollapsed ? "Expandir todo" : "Contraer todo"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
