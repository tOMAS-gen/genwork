"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { Tag, Search } from "@/components/ui/icons";
import { normalizeTagName } from "@/lib/domain/tags/parser";

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

export interface WorkLabelDto {
  keyId: string;
  keyName: string;
  valueId: string;
  valueName: string;
  color: string;
}


/**
 * Chips de etiquetas del proyecto (FR-410) + picker para asignar/quitar valores por clave
 * (FR-409) + gestión inline de claves/valores del ámbito (FR-408/411, sin pantalla nueva).
 * Sin gate de permisos duplicado en el cliente: si el usuario no administra el ámbito, las
 * acciones de creación/edición de claves/valores devuelven 403 y se muestra el error (spec R6).
 */
export function LabelPicker({
  workId,
  workGroupId,
  labels,
  onChanged,
}: {
  workId: string;
  workGroupId: string | null;
  labels: WorkLabelDto[];
  /** Reservado para futuros gates de UI; la gestión decide permisos vía 403 del servidor. */
  canManageAmbito?: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<LabelKeyDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const labelsQuery = workGroupId ? `?groupId=${workGroupId}` : "";

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<LabelKeyDto[]>(`/api/labels${labelsQuery}`);
      setKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    setOpen(true);
    setError("");
    setQuery("");
    void loadKeys();
  };

  const assignedValueId = (keyId: string) =>
    labels.find((l) => l.keyId === keyId)?.valueId ?? null;

  const scopeLabel: Record<"global" | "group" | "personal", string> = {
    global: "Globales",
    group: "Del grupo",
    personal: "Personales",
  };

  // Filtro por texto: matchea nombre de clave o de valor (case/acento-insensible).
  // Si la clave matchea, se muestran todos sus valores; si no, solo los valores
  // que matcheen individualmente.
  const filteredKeys = useMemo(() => {
    const q = normalizeTagName(query.trim());
    if (!q) return keys;
    return keys
      .map((k) => {
        if (normalizeTagName(k.name).includes(q)) return k;
        const values = k.values.filter((v) => normalizeTagName(v.name).includes(q));
        return values.length > 0 ? { ...k, values } : null;
      })
      .filter((k): k is LabelKeyDto => k !== null);
  }, [keys, query]);

  const scopeSections = (["global", "group", "personal"] as const)
    .map((scope) => ({ scope, keys: filteredKeys.filter((k) => (k.scope ?? "personal") === scope) }))
    .filter((section) => section.keys.length > 0);

  const toggleValue = async (keyId: string, valueId: string) => {
    setError("");
    try {
      if (assignedValueId(keyId) === valueId) {
        await api(`/api/works/${workId}/labels?keyId=${keyId}`, { method: "DELETE" });
      } else {
        await api(`/api/works/${workId}/labels`, {
          method: "PUT",
          body: JSON.stringify({ keyId, valueId }),
        });
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {labels.map((l) => (
        <span key={l.keyId} className="label-chip color-chip" style={{ "--c": l.color } as React.CSSProperties}>
          {l.valueName}
        </span>
      ))}
      <button className="icon-btn" aria-label="Etiquetas" onClick={openPicker}>
        <Tag size={16} />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Etiquetas del proyecto">
        {loading && <p className="muted">Cargando…</p>}

        {!loading && keys.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            No hay etiquetas disponibles.
          </p>
        )}

        {!loading && keys.length > 0 && (
          <div className="label-picker-search">
            <Search size={15} className="label-picker-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar etiqueta…"
              aria-label="Buscar etiqueta"
              autoFocus
            />
          </div>
        )}

        {!loading && keys.length > 0 && scopeSections.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            Sin resultados.
          </p>
        )}

        {!loading &&
          scopeSections.map((section) => (
            <div key={section.scope} style={{ display: "grid", gap: "var(--space-2)" }}>
              <span
                className="muted"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}
              >
                {scopeLabel[section.scope]}
              </span>
              {section.keys.map((key) => (
                <div key={key.id} style={{ display: "grid", gap: 4 }}>
                  <strong style={{ fontSize: 13 }}>{key.name}</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {key.values.map((v) => (
                      <button
                        key={v.id}
                        className="label-chip color-chip"
                        style={{
                          "--c": v.color,
                          border:
                            assignedValueId(key.id) === v.id
                              ? "2px solid var(--text)"
                              : "2px solid transparent",
                          cursor: "pointer",
                        } as React.CSSProperties}
                        onClick={() => void toggleValue(key.id, v.id)}
                      >
                        {v.name}
                      </button>
                    ))}
                    {key.values.length === 0 && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        Sin valores todavía
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}


        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      </Dialog>
    </div>
  );
}
