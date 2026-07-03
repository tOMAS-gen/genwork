"use client";

/** Barra de filtros combinables (FR-013, US4): trabajo + referencia + estado. */
export interface FilterState {
  workId: string;
  refSectorId: string;
  state: "" | "PENDING" | "DONE";
}

export function FilterBar({
  filters,
  onChange,
  works,
  sectors,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  works: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 8, margin: "10px 0", flexWrap: "wrap" }}>
      <select
        value={filters.workId}
        onChange={(e) => onChange({ ...filters, workId: e.target.value })}
        style={{ width: 180 }}
      >
        <option value="">Todos los proyectos</option>
        {works.map((w) => (
          <option key={w.id} value={w.id}>
            /{w.name}
          </option>
        ))}
      </select>
      <select
        value={filters.refSectorId}
        onChange={(e) => onChange({ ...filters, refSectorId: e.target.value })}
        style={{ width: 180 }}
      >
        <option value="">Todas las referencias</option>
        {sectors.map((s) => (
          <option key={s.id} value={s.id}>
            @{s.name}
          </option>
        ))}
      </select>
      <select
        value={filters.state}
        onChange={(e) => onChange({ ...filters, state: e.target.value as FilterState["state"] })}
        style={{ width: 150 }}
      >
        <option value="">Todos los estados</option>
        <option value="PENDING">Pendientes</option>
        <option value="DONE">Realizadas</option>
      </select>
      {(filters.workId || filters.refSectorId || filters.state) && (
        <button
          className="btn"
          onClick={() => onChange({ workId: "", refSectorId: "", state: "" })}
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
