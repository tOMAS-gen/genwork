"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Trash2, Plus, Pencil } from "@/components/ui/icons";
import { ColorField } from "@/components/ui/ColorField";

interface LabelValueDto {
  id: string;
  name: string;
  color: string;
}

interface LabelKeyDto {
  id: string;
  name: string;
  scope: "global" | "group" | "personal";
  values: LabelValueDto[];
}

/** Ámbito de datos que administra este componente (ver research.md R7). */
export type LabelAdminScope = { kind: "global" } | { kind: "group"; groupId: string };

/** Color hex por defecto para un valor de etiqueta nuevo. */
const DEFAULT_COLOR = "#ef4444";

/** Extrae el mensaje/detalle de un error lanzado por el helper `api` (contrato { error }). */
function errorInfo(err: unknown): { message: string; affectedWorks?: number; status?: number } {
  const e = err as Error & {
    status?: number;
    body?: { error?: { message?: string; affectedWorks?: number } };
  };
  return {
    message: e.body?.error?.message ?? e.message ?? "Error inesperado",
    affectedWorks: e.body?.error?.affectedWorks,
    status: e.status,
  };
}

/**
 * Administración de etiquetas de un ámbito dado (global o de grupo, `scope` prop).
 * Tabla de claves con edición inline del nombre, valores como chips con color y
 * alta/baja de claves y valores. Reutiliza los mismos contratos que LabelPicker.
 *
 * `GET /api/labels` devuelve la UNIÓN (globales + ámbito); para una pantalla de
 * administración se filtra client-side quedándose solo con las claves cuyo
 * `scope` coincide con el ámbito administrado (R7/contracts/labels-api.md).
 */
export function LabelAdmin({ scope }: { scope: LabelAdminScope }) {
  const [keys, setKeys] = useState<LabelKeyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newValue, setNewValue] = useState<Record<string, { name: string; color: string }>>({});
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyName, setEditingKeyName] = useState("");
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        scope.kind === "group" ? `/api/labels?groupId=${scope.groupId}` : "/api/labels";
      const data = await api<LabelKeyDto[]>(url);
      // El endpoint devuelve la unión (globales + ámbito); acá administramos
      // solo las claves del ámbito propio, no las globales heredadas.
      setKeys(data.filter((k) => k.scope === scope.kind));
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.kind, scope.kind === "group" ? scope.groupId : null]);

  const createKey = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setError("");
    try {
      const body =
        scope.kind === "group"
          ? { name, groupId: scope.groupId }
          : { name, global: true };
      await api("/api/labels", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewKeyName("");
      setCreatingKey(false);
      await loadKeys();
    } catch (err) {
      setError(errorInfo(err).message);
    }
  };

  const startEditKey = (key: LabelKeyDto) => {
    setEditingKeyId(key.id);
    setEditingKeyName(key.name);
  };

  const saveKeyName = async (id: string) => {
    const name = editingKeyName.trim();
    setEditingKeyId(null);
    const original = keys.find((k) => k.id === id)?.name ?? "";
    if (!name || name === original) return;
    setError("");
    try {
      await api(`/api/labels/keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadKeys();
    } catch (err) {
      setError(errorInfo(err).message);
    }
  };

  const deleteKey = async (id: string) => {
    setError("");
    try {
      await api(`/api/labels/keys/${id}`, { method: "DELETE" });
      await loadKeys();
    } catch (err) {
      const info = errorInfo(err);
      if (info.status === 409 && info.affectedWorks !== undefined) {
        if (await showConfirm(info.message + "\n\n¿Eliminar la etiqueta igualmente?", { title: "Eliminar etiqueta", confirmLabel: "Eliminar", danger: true })) {
          try {
            await api(`/api/labels/keys/${id}?confirm=true`, { method: "DELETE" });
            await loadKeys();
          } catch (err2) {
            setError(errorInfo(err2).message);
          }
        }
        return;
      }
      setError(info.message);
    }
  };

  const addValue = async (keyId: string) => {
    const draft = newValue[keyId] ?? { name: "", color: DEFAULT_COLOR };
    const name = draft.name.trim();
    if (!name) return;
    setError("");
    try {
      await api("/api/labels/values", {
        method: "POST",
        body: JSON.stringify({ keyId, name, color: draft.color }),
      });
      setNewValue((prev) => ({ ...prev, [keyId]: { name: "", color: draft.color } }));
      await loadKeys();
    } catch (err) {
      setError(errorInfo(err).message);
    }
  };

  const deleteValue = async (id: string) => {
    setError("");
    try {
      await api(`/api/labels/values/${id}`, { method: "DELETE" });
      await loadKeys();
    } catch (err) {
      const info = errorInfo(err);
      if (info.status === 409 && info.affectedWorks !== undefined) {
        if (await showConfirm(info.message + "\n\n¿Eliminar el valor igualmente?", { title: "Eliminar valor", confirmLabel: "Eliminar", danger: true })) {
          try {
            await api(`/api/labels/values/${id}?confirm=true`, { method: "DELETE" });
            await loadKeys();
          } catch (err2) {
            setError(errorInfo(err2).message);
          }
        }
        return;
      }
      setError(info.message);
    }
  };

  return (
    <div className="label-admin">
      {loading && <p className="muted">Cargando…</p>}
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

      {!loading && (
        <div className="label-admin-grid">
          {keys.map((key) => {
            const draft = newValue[key.id] ?? { name: "", color: DEFAULT_COLOR };
            const expanded = expandedKeyId === key.id;
            return (
              <div key={key.id} className="label-admin-card">
                <div className="label-admin-card-head">
                  {editingKeyId === key.id ? (
                    <input
                      autoFocus
                      value={editingKeyName}
                      onChange={(e) => setEditingKeyName(e.target.value)}
                      onBlur={() => void saveKeyName(key.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveKeyName(key.id);
                        if (e.key === "Escape") setEditingKeyId(null);
                      }}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  ) : (
                    <span className="label-admin-key-label">
                      <button
                        className="label-admin-key-name"
                        onClick={() => startEditKey(key)}
                        aria-label={`Editar clave ${key.name}`}
                      >
                        {key.name}
                      </button>
                      <span className="label-admin-count" aria-label={`${key.values.length} valores`}>
                        {key.values.length}
                      </span>
                    </span>
                  )}
                  <div className="label-admin-card-acts">
                    <button
                      className="icon-btn"
                      aria-label={`Editar clave ${key.name}`}
                      onClick={() => startEditKey(key)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Eliminar clave ${key.name}`}
                      onClick={() => void deleteKey(key.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {key.values.map((v) => (
                    <span
                      key={v.id}
                      className="label-chip color-chip"
                      style={{ ["--c"]: v.color, display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties}
                    >
                      {v.name}
                      {expanded && (
                        <button
                          className="icon-btn"
                          aria-label={`Eliminar valor ${v.name}`}
                          onClick={() => void deleteValue(v.id)}
                          style={{ padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                  {key.values.length === 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      Sin valores todavía
                    </span>
                  )}
                  <button
                    className="label-admin-add-value"
                    aria-label={`Agregar valor a ${key.name}`}
                    onClick={() => setExpandedKeyId(expanded ? null : key.id)}
                  >
                    <Plus size={13} />
                    Valor
                  </button>
                </div>

                {expanded && (
                  <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        setNewValue((prev) => ({
                          ...prev,
                          [key.id]: { ...draft, name: e.target.value },
                        }))
                      }
                      placeholder="Nuevo valor"
                      style={{ flex: "1 1 160px", minWidth: 0 }}
                      onKeyDown={(e) => e.key === "Enter" && void addValue(key.id)}
                    />
                    <ColorField
                      value={draft.color}
                      ariaLabel={`Color del nuevo valor de ${key.name}`}
                      onChange={(hex) =>
                        setNewValue((prev) => ({
                          ...prev,
                          [key.id]: { ...draft, color: hex },
                        }))
                      }
                    />
                    <button className="btn" onClick={() => void addValue(key.id)}>
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="label-admin-card label-admin-new">
            {creatingKey ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  id="la-new-key"
                  autoFocus
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ej.: Prioridad"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void createKey();
                    if (e.key === "Escape") {
                      setCreatingKey(false);
                      setNewKeyName("");
                    }
                  }}
                  onBlur={() => {
                    if (!newKeyName.trim()) setCreatingKey(false);
                  }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="btn" onClick={() => void createKey()}>
                  Agregar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="label-admin-new-trigger"
                onClick={() => setCreatingKey(true)}
              >
                <Plus size={16} />
                Nueva clave
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
