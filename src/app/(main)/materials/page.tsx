"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, Search } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";

interface MaterialTotal {
  genstockProductId: string;
  productName: string;
  productCode: string;
  humanCode: string;
  unitId: string;
  unitName: string | null;
  unitAbbreviation: string | null;
  unitAllowsDecimal: boolean | null;
  unitMagnitude: string | null;
  unitFactor: string | null;
  unitIsBase: boolean | null;
  totalQuantityRequired: string;
  projects: {
    workId: string;
    workName: string;
    groupName: string | null;
    quantityRequired: string;
  }[];
}

interface GenstockContext {
  units?: {
    id: string;
    name: string;
    abbreviation: string;
    magnitude?: string | null;
    factor?: string | null;
    is_base?: boolean | null;
  }[];
}

export default function MaterialsPage() {
  usePageTitle("Materiales");
  const [rows, setRows] = useState<MaterialTotal[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<GenstockContext | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    void api<MaterialTotal[]>("/api/materials")
      .then((body) => {
        setRows(body);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void api<MaterialTotal[]>("/api/materials")
      .then((body) => {
        setRows(body);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    void api<GenstockContext>("/api/genstock/context")
      .then(setContext)
      .catch(() => setContext(null));
  }, []);
  useLiveRefresh(load);

  const unitById = useMemo(
    () => new Map((context?.units ?? []).map((unit) => [unit.id, unit])),
    [context],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.productName} ${row.productCode} ${row.humanCode}`.toLowerCase().includes(term),
    );
  }, [rows, query]);

  return (
    <div className="sheet">
      <div className="sheet-header">
        <div>
          <div className="sheet-title-row">
            <Package size={24} className="muted" />
            <h1 className="sheet-title">Materiales</h1>
          </div>
          <p className="sheet-desc">Totales consolidados de proyectos activos visibles.</p>
        </div>
      </div>

      <div className="materials-page-toolbar">
        <label className="materials-searchbar">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por material o código"
            aria-label="Filtrar materiales"
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          <Skeleton variant="text" height="40px" width="100%" />
          <Skeleton variant="text" height="40px" width="100%" />
          <Skeleton variant="text" height="40px" width="100%" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay materiales cargados"
          description="Los materiales que agregues en cada proyecto aparecerán consolidados acá."
        />
      ) : (
        <div className="table-scroll-wrapper">
          <table className="data-table data-table-static materials-total-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Total</th>
                <th>Proyectos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.genstockProductId}>
                  <td>
                    <strong>{row.productName}</strong>
                    <div className="muted">{row.humanCode || row.productCode}</div>
                    {formatUnitFactor(row, unitById) && (
                      <div className="muted">{formatUnitFactor(row, unitById)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{formatQuantity(row.totalQuantityRequired, row, unitById)}</strong>
                  </td>
                  <td>
                    <div className="materials-project-breakdown">
                      {row.projects.map((project) => (
                        <Link key={project.workId} href={`/works/${project.workId}`}>
                          <span>{project.workName}</span>
                          {project.groupName && <span className="muted">{project.groupName}</span>}
                          <strong>{formatQuantity(project.quantityRequired, row, unitById)}</strong>
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="muted">Sin materiales que coincidan.</p>}
        </div>
      )}
    </div>
  );
}

function formatQuantity(
  quantity: string,
  material: {
    unitId: string;
    unitName: string | null;
    unitAbbreviation: string | null;
  },
  unitById: Map<string, { id: string; name: string; abbreviation: string }>,
) {
  const unit = unitById.get(material.unitId);
  const label =
    material.unitAbbreviation || material.unitName || unit?.abbreviation || unit?.name || "";
  return label ? `${quantity} ${label}` : quantity;
}

function formatUnitFactor(
  material: {
    unitId: string;
    unitName: string | null;
    unitAbbreviation: string | null;
    unitMagnitude: string | null;
    unitFactor: string | null;
    unitIsBase: boolean | null;
  },
  unitById: Map<
    string,
    {
      id: string;
      name: string;
      abbreviation: string;
      magnitude?: string | null;
      factor?: string | null;
      is_base?: boolean | null;
    }
  >,
) {
  const unit = unitById.get(material.unitId);
  const factor = material.unitFactor || unit?.factor;
  const isBase = material.unitIsBase ?? unit?.is_base ?? null;
  if (!factor || isBase) return "";

  const label =
    material.unitAbbreviation || material.unitName || unit?.abbreviation || unit?.name || "unidad";
  const magnitude = material.unitMagnitude || unit?.magnitude || "unidad base";
  const shown = Number.isFinite(Number(factor))
    ? Number(factor).toLocaleString("es-AR", { maximumFractionDigits: 8 })
    : factor;
  return `1 ${label} = ${shown} ${magnitude}`;
}
