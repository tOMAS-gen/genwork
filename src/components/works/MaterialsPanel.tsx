"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Check, Package, Search, Trash2 } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

interface MaterialDto {
  id: string;
  workId: string;
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
  quantityRequired: string;
  notes: string | null;
}

interface GenstockSearchItem {
  product: {
    id: string;
    name: string;
    product_code: string;
    human_code: string;
    unit_id: string;
    brand?: { id: string; name: string } | null;
  };
  prices: {
    price_list_id: string;
    currency_id: string;
    price: string | null;
    min_quantity: string | null;
  }[];
  warehouses: { warehouse_id: string; stock_mode: string; stock_available: string | null }[];
}

interface GenstockSearchResponse {
  items: GenstockSearchItem[];
  total: number;
  has_more: boolean;
}

interface GenstockContext {
  price_lists: { id: string; name: string; currency_id: string }[];
  currencies: { id: string; code: string; symbol: string; decimals: number }[];
  warehouses: { id: string; name: string }[];
  units?: {
    id: string;
    name: string;
    abbreviation: string;
    magnitude?: string | null;
    factor?: string | null;
    is_base?: boolean | null;
    allows_decimal: boolean;
  }[];
}

interface Draft {
  quantityRequired: string;
  notes: string;
}

function normalizeQuantityInput(value: string, allowsDecimal = true) {
  const normalized = value.replace(",", ".");
  if (!allowsDecimal) return normalized.replace(/\D/g, "");
  return normalized.replace(/[^\d.]/g, "");
}

export function MaterialsPanel({ workId, editable }: { workId: string; editable: boolean }) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenstockSearchItem[]>([]);
  const [selected, setSelected] = useState<GenstockSearchItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<GenstockContext | null>(null);

  const load = useCallback(() => {
    void api<MaterialDto[]>(`/api/works/${workId}/materials`)
      .then((rows) => {
        setMaterials(rows);
        setDrafts(
          Object.fromEntries(
            rows.map((row) => [
              row.id,
              { quantityRequired: row.quantityRequired, notes: row.notes ?? "" },
            ]),
          ),
        );
      })
      .catch((err: Error) => setStatus(err.message));
  }, [workId]);

  useEffect(load, [load]);

  useEffect(() => {
    void api<GenstockContext>("/api/genstock/context")
      .then(setContext)
      .catch(() => setContext(null));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void api<GenstockSearchResponse>(`/api/genstock/search?q=${encodeURIComponent(q)}`)
        .then((body) => {
          setResults(body.items);
          setStatus("");
        })
        .catch((err: Error) => {
          setResults([]);
          setStatus(err.message);
        })
        .finally(() => setSearching(false));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const assignedProductIds = useMemo(
    () => new Set(materials.map((material) => material.genstockProductId)),
    [materials],
  );

  const priceListById = useMemo(
    () => new Map(context?.price_lists.map((priceList) => [priceList.id, priceList]) ?? []),
    [context],
  );
  const currencyById = useMemo(
    () => new Map(context?.currencies.map((currency) => [currency.id, currency]) ?? []),
    [context],
  );
  const warehouseById = useMemo(
    () => new Map(context?.warehouses.map((warehouse) => [warehouse.id, warehouse]) ?? []),
    [context],
  );
  const unitById = useMemo(
    () => new Map((context?.units ?? []).map((unit) => [unit.id, unit])),
    [context],
  );

  const add = async () => {
    if (!selected) return;
    const selectedUnit = unitById.get(selected.product.unit_id);
    setSaving(true);
    setStatus("");
    try {
      await api(`/api/works/${workId}/materials`, {
        method: "POST",
        body: JSON.stringify({
          productId: selected.product.id,
          quantityRequired: normalizeQuantityInput(quantity, selectedUnit?.allows_decimal ?? true),
          notes: notes.trim() || null,
        }),
      });
      setQuery("");
      setResults([]);
      setSelected(null);
      setQuantity("1");
      setNotes("");
      load();
      toast("Material agregado", "success");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = async (material: MaterialDto) => {
    const draft = drafts[material.id];
    if (!draft) return;
    setSaving(true);
    setStatus("");
    try {
      await api(`/api/works/${workId}/materials/${material.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantityRequired: normalizeQuantityInput(
            draft.quantityRequired,
            material.unitAllowsDecimal ?? true,
          ),
          notes: draft.notes.trim() || null,
        }),
      });
      load();
      toast("Material actualizado", "success");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (material: MaterialDto) => {
    setSaving(true);
    setStatus("");
    try {
      await api(`/api/works/${workId}/materials/${material.id}`, { method: "DELETE" });
      load();
      toast("Material quitado", "success");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="materials-panel">
      {editable && (
        <div className="materials-add">
          <div className="materials-searchbar">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                setSelected(null);
                if (next.trim().length < 2) {
                  setResults([]);
                  setSearching(false);
                } else {
                  setSearching(true);
                }
              }}
              placeholder="Buscar producto en Genstock"
              aria-label="Buscar producto en Genstock"
            />
          </div>

          {query.trim().length >= 2 && (
            <div className="materials-results" aria-live="polite">
              {searching ? (
                <p className="muted">Buscando productos...</p>
              ) : results.length === 0 ? (
                <p className="muted">Sin productos para esta búsqueda.</p>
              ) : (
                results.map((item) => {
                  const alreadyAssigned = assignedProductIds.has(item.product.id);
                  const unit = unitById.get(item.product.unit_id);
                  const unitLabel = formatUnit(
                    {
                      unitId: item.product.unit_id,
                      unitName: unit?.name ?? null,
                      unitAbbreviation: unit?.abbreviation ?? null,
                    },
                    unitById,
                  );
                  const unitFactor = formatUnitFactor({
                    unitName: unit?.name ?? null,
                    unitAbbreviation: unit?.abbreviation ?? null,
                    unitMagnitude: unit?.magnitude ?? null,
                    unitFactor: unit?.factor ?? null,
                    unitIsBase: unit?.is_base ?? null,
                  });
                  return (
                    <button
                      key={item.product.id}
                      type="button"
                      className={`material-result${selected?.product.id === item.product.id ? " is-selected" : ""}`}
                      onClick={() => setSelected(item)}
                      disabled={alreadyAssigned}
                    >
                      <span>
                        <strong>{item.product.name}</strong>
                        <span className="muted">
                          {item.product.human_code || item.product.product_code}
                          {item.product.brand ? ` · ${item.product.brand.name}` : ""}
                          {unitLabel ? ` · ${unitLabel}` : ""}
                        </span>
                        {unitFactor && <span className="muted">{unitFactor}</span>}
                      </span>
                      <span className="material-result-meta">
                        {alreadyAssigned ? "Ya asignado" : renderStockSummary(item, warehouseById)}
                      </span>
                      <span className="material-result-prices">
                        {renderPriceSummary(item, priceListById, currencyById)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {selected && (
            <div className="materials-selected-row">
              {(() => {
                const selectedUnit = unitById.get(selected.product.unit_id);
                const allowsDecimal = selectedUnit?.allows_decimal ?? true;
                const unitLabel = formatUnit(
                  {
                    unitId: selected.product.unit_id,
                    unitName: selectedUnit?.name ?? null,
                    unitAbbreviation: selectedUnit?.abbreviation ?? null,
                  },
                  unitById,
                );
                const unitFactor = formatUnitFactor({
                  unitName: selectedUnit?.name ?? null,
                  unitAbbreviation: selectedUnit?.abbreviation ?? null,
                  unitMagnitude: selectedUnit?.magnitude ?? null,
                  unitFactor: selectedUnit?.factor ?? null,
                  unitIsBase: selectedUnit?.is_base ?? null,
                });
                return (
                  <>
                    <div>
                      <strong>{selected.product.name}</strong>
                      <div className="muted">
                        {selected.product.human_code || selected.product.product_code}
                      </div>
                      {unitFactor && <div className="muted">{unitFactor}</div>}
                    </div>
                    <label>
                      Cantidad{unitLabel ? ` (${unitLabel})` : ""}
                      <input
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(normalizeQuantityInput(e.target.value, allowsDecimal))
                        }
                        inputMode={allowsDecimal ? "decimal" : "numeric"}
                        step={allowsDecimal ? "any" : "1"}
                      />
                    </label>
                  </>
                );
              })()}
              <label>
                Notas
                <input value={notes} maxLength={280} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void add()}
                disabled={saving}
              >
                <Check size={15} /> Agregar
              </button>
            </div>
          )}
        </div>
      )}

      {status && <p className="form-error">{status}</p>}

      {materials.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin materiales asignados"
          description="Agregá productos de Genstock para calcular lo necesario en este proyecto."
        />
      ) : (
        <div className="table-scroll-wrapper">
          <table className="project-table materials-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Notas</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const draft = drafts[material.id] ?? {
                  quantityRequired: material.quantityRequired,
                  notes: material.notes ?? "",
                };
                const unitLabel = formatUnit(material, unitById);
                const unitFactor = formatUnitFactor(material);
                const allowsDecimal = material.unitAllowsDecimal ?? true;
                return (
                  <tr key={material.id}>
                    <td>
                      <strong>{material.productName}</strong>
                      <div className="muted">{material.humanCode || material.productCode}</div>
                      {unitFactor && <div className="muted">{unitFactor}</div>}
                    </td>
                    <td>
                      {editable ? (
                        <>
                          <input
                            value={draft.quantityRequired}
                            inputMode={allowsDecimal ? "decimal" : "numeric"}
                            step={allowsDecimal ? "any" : "1"}
                            onChange={(e) =>
                              setDrafts((current) => ({
                                ...current,
                                [material.id]: {
                                  ...draft,
                                  quantityRequired: normalizeQuantityInput(
                                    e.target.value,
                                    allowsDecimal,
                                  ),
                                },
                              }))
                            }
                            aria-label={`Cantidad necesaria de ${material.productName}`}
                          />
                          {unitLabel && (
                            <div className="muted">
                              {unitLabel}
                              {!allowsDecimal ? " · entero" : ""}
                            </div>
                          )}
                        </>
                      ) : (
                        formatQuantity(material.quantityRequired, unitLabel)
                      )}
                    </td>
                    <td>
                      {editable ? (
                        <input
                          value={draft.notes}
                          maxLength={280}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [material.id]: { ...draft, notes: e.target.value },
                            }))
                          }
                          aria-label={`Notas de ${material.productName}`}
                        />
                      ) : (
                        material.notes || <span className="muted">Sin notas</span>
                      )}
                    </td>
                    {editable && (
                      <td>
                        <div className="materials-row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => void save(material)}
                            disabled={saving}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => void remove(material)}
                            disabled={saving}
                            aria-label={`Quitar ${material.productName}`}
                            title="Quitar material"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
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

function renderStockSummary(
  item: GenstockSearchItem,
  warehouseById: Map<string, { id: string; name: string }>,
) {
  if (item.warehouses.length === 0) return "Sin stock publicado";
  const first = item.warehouses[0];
  const name = warehouseById.get(first.warehouse_id)?.name ?? "Almacén";
  if (first.stock_available === null) return `${name}: sin control`;
  return `${name}: ${first.stock_available}`;
}

function renderPriceSummary(
  item: GenstockSearchItem,
  priceListById: Map<string, { id: string; name: string; currency_id: string }>,
  currencyById: Map<string, { id: string; code: string; symbol: string }>,
) {
  const priced = item.prices.find((price) => price.price !== null);
  if (!priced?.price) return "Sin precio público";
  const list = priceListById.get(priced.price_list_id);
  const currency = currencyById.get(priced.currency_id);
  return `${currency?.symbol ?? ""}${priced.price}${list ? ` · ${list.name}` : ""}`;
}

function formatUnit(
  material: {
    unitId: string;
    unitName: string | null;
    unitAbbreviation: string | null;
  },
  unitById: Map<string, { id: string; name: string; abbreviation: string }>,
) {
  const unit = unitById.get(material.unitId);
  return material.unitAbbreviation || material.unitName || unit?.abbreviation || unit?.name || "";
}

function formatQuantity(quantity: string, unitLabel: string) {
  return unitLabel ? `${quantity} ${unitLabel}` : quantity;
}

function formatUnitFactor(unit: {
  unitName: string | null;
  unitAbbreviation: string | null;
  unitMagnitude: string | null | undefined;
  unitFactor: string | null | undefined;
  unitIsBase: boolean | null | undefined;
}) {
  if (!unit.unitFactor || unit.unitIsBase) return "";
  const label = unit.unitAbbreviation || unit.unitName || "unidad";
  const magnitude = unit.unitMagnitude || "unidad base";
  return `1 ${label} = ${unit.unitFactor} ${magnitude}`;
}
