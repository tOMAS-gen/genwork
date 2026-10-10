"use client";

import { Toolbar, ToolbarFilterField } from "@gen/ui";
import { LayoutGrid, List } from "@/components/ui/icons";
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

const SORT_OPTIONS: { value: SectorSortKey; label: string }[] = [
  { value: "name", label: "Nombre · A–Z" },
  { value: "pending", label: "Más pendientes" },
  { value: "tasks", label: "Más tareas" },
  { value: "progress", label: "Mayor avance" },
];

/** Buscar, filtrar por ámbito, ordenar y cambiar la vista de sectores (`Toolbar` de @gen/ui). */
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
  const activeScope = scopes.find((item) => item.key === scope);

  return (
    <Toolbar
      ariaLabel="Buscar, filtrar y ordenar sectores"
      search={{ value: searchText, onChange: onSearchChange, placeholder: "Buscar sectores...", ariaLabel: "Buscar sectores" }}
      filters={{
        activeCount: scope ? 1 : 0,
        content: (
          <ToolbarFilterField
            label="Grupo o ámbito"
            value={scope}
            onChange={onScopeChange}
            allLabel="Todos los sectores"
            options={scopes.map((item) => ({ value: item.key, label: item.title }))}
          />
        ),
      }}
      sort={{
        value: sort,
        onChange: (value) => onSortChange(value as SectorSortKey),
        options: SORT_OPTIONS,
        ariaLabel: "Ordenar sectores",
      }}
      view={{
        value: viewMode,
        onChange: onViewModeChange,
        ariaLabel: "Vista de sectores",
        options: [
          { value: "grid", label: "Ver como grilla", icon: LayoutGrid },
          { value: "list", label: "Ver como lista", icon: List },
        ],
      }}
      count={loading ? "Cargando sectores…" : `${resultCount} ${resultCount === 1 ? "sector" : "sectores"}`}
      chips={activeScope ? [{ key: "scope", label: activeScope.title, onRemove: () => onScopeChange("") }] : []}
      onReset={
        searchText || scope
          ? () => {
              onSearchChange("");
              onScopeChange("");
            }
          : undefined
      }
      summaryActions={
        canToggleAll && (
          <button type="button" className="toolbar-reset" onClick={onToggleAll}>
            {allCollapsed ? "Expandir todo" : "Contraer todo"}
          </button>
        )
      }
    />
  );
}
