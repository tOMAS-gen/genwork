"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

/** Barra de filtros combinables (FR-013, US4; FR-008 de 032): trabajo + referencia + estado + etiqueta. */
export interface FilterState {
  workId: string;
  refSectorId: string;
  state: "" | "PENDING" | "DONE";
  labelValueId: string;
}

interface LabelValueDto {
  id: string;
  name: string;
  color: string;
}

interface LabelKeyDto {
  id: string;
  name: string;
  scope?: "global" | "group" | "personal";
  values: LabelValueDto[];
}

const EMPTY_FILTERS: FilterState = { workId: "", refSectorId: "", state: "", labelValueId: "" };

export function FilterBar({
  filters,
  onChange,
  works,
  sectors,
  groupId,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  works: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  /** Grupo del sector (US2, FR-008): acota las etiquetas disponibles para filtrar (grupo + globales). */
  groupId?: string | null;
}) {
  const [labelOptions, setLabelOptions] = useState<
    { keyName: string; valueId: string; valueName: string; color: string }[]
  >([]);

  useEffect(() => {
    const qs = groupId ? `?groupId=${groupId}` : "";
    void api<LabelKeyDto[]>(`/api/labels${qs}`)
      .then((keys) => {
        setLabelOptions(
          keys.flatMap((k) =>
            k.values.map((v) => ({ keyName: k.name, valueId: v.id, valueName: v.name, color: v.color })),
          ),
        );
      })
      .catch(() => {});
  }, [groupId]);

  const hasFilters =
    !!filters.workId || !!filters.refSectorId || !!filters.state || !!filters.labelValueId;
  const activeLabelColor =
    labelOptions.find((l) => l.valueId === filters.labelValueId)?.color ?? null;

  return (
    <div className="filter-pills">
      <label className={`filter-pill${filters.workId ? " is-active" : ""}`}>
        <select
          value={filters.workId}
          onChange={(e) => onChange({ ...filters, workId: e.target.value })}
        >
          <option value="">Todos los proyectos</option>
          {works.map((w) => (
            <option key={w.id} value={w.id}>
              /{w.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`filter-pill${filters.refSectorId ? " is-active" : ""}`}>
        <select
          value={filters.refSectorId}
          onChange={(e) => onChange({ ...filters, refSectorId: e.target.value })}
        >
          <option value="">Todas las referencias</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              @{s.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`filter-pill${filters.state ? " is-active" : ""}`}>
        <select
          value={filters.state}
          onChange={(e) => onChange({ ...filters, state: e.target.value as FilterState["state"] })}
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="DONE">Realizadas</option>
        </select>
      </label>
      <label className={`filter-pill${filters.labelValueId ? " is-active" : ""}`}>
        {activeLabelColor && (
          <span className="filter-pill-dot" style={{ background: activeLabelColor }} aria-hidden="true" />
        )}
        <select
          value={filters.labelValueId}
          onChange={(e) => onChange({ ...filters, labelValueId: e.target.value })}
        >
          <option value="">Todas las etiquetas</option>
          {labelOptions.map((l) => (
            <option key={l.valueId} value={l.valueId}>
              {l.keyName}: {l.valueName}
            </option>
          ))}
        </select>
      </label>
      {hasFilters && (
        <button className="filter-clear" onClick={() => onChange(EMPTY_FILTERS)}>
          Limpiar
        </button>
      )}
    </div>
  );
}
