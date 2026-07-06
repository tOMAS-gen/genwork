"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { Tag } from "@/components/ui/icons";

interface LabelValueDto {
  id: string;
  name: string;
  color: string;
}

interface LabelKeyDto {
  id: string;
  name: string;
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
    void loadKeys();
  };

  const assignedValueId = (keyId: string) =>
    labels.find((l) => l.keyId === keyId)?.valueId ?? null;

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
        <span key={l.keyId} className={`label-chip label-${l.color.toLowerCase()}`}>
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
            Todavía no hay etiquetas en este ámbito.
          </p>
        )}

        {!loading &&
          keys.map((key) => (
            <div key={key.id} style={{ display: "grid", gap: 4 }}>
              <strong style={{ fontSize: 13 }}>{key.name}</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {key.values.map((v) => (
                  <button
                    key={v.id}
                    className={`label-chip label-${v.color.toLowerCase()}`}
                    style={{
                      border:
                        assignedValueId(key.id) === v.id
                          ? "2px solid var(--text)"
                          : "2px solid transparent",
                      cursor: "pointer",
                    }}
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


        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      </Dialog>
    </div>
  );
}
