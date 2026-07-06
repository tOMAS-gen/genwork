"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Trash2, Plus, Pencil } from "@/components/ui/icons";

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

const COLORS: { value: string; label: string }[] = [
  { value: "RED", label: "Rojo" },
  { value: "ORANGE", label: "Naranja" },
  { value: "AMBER", label: "Ámbar" },
  { value: "GREEN", label: "Verde" },
  { value: "TEAL", label: "Verde azulado" },
  { value: "BLUE", label: "Azul" },
  { value: "INDIGO", label: "Índigo" },
  { value: "VIOLET", label: "Violeta" },
  { value: "PINK", label: "Rosa" },
  { value: "GRAY", label: "Gris" },
];

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
 * Administración de etiquetas del ámbito por defecto (personal/global, sin groupId).
 * Tabla de claves con edición inline del nombre, valores como chips con color y
 * alta/baja de claves y valores. Reutiliza los mismos contratos que LabelPicker.
 */
export function LabelAdmin() {
  const [keys, setKeys] = useState<LabelKeyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newValue, setNewValue] = useState<Record<string, { name: string; color: string }>>({});
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyName, setEditingKeyName] = useState("");
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<LabelKeyDto[]>("/api/labels");
      setKeys(data);
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  }, []);

  const createKey = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setError("");
    try {
      await api("/api/labels", {
        method: "POST",
        body: JSON.stringify({ name, groupId: null }),
      });
      setNewKeyName("");
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
        if (confirm(`${info.message}\n\n¿Eliminar la etiqueta igualmente?`)) {
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
    const draft = newValue[keyId] ?? { name: "", color: "RED" };
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
        if (confirm(`${info.message}\n\n¿Eliminar el valor igualmente?`)) {
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
    <div className="card" style={{ display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>Etiquetas</h2>

      {loading && <p className="muted">Cargando…</p>}
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

      {!loading && keys.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>
          Todavía no hay etiquetas en este ámbito.
        </p>
      )}

      {!loading && keys.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "6px 8px", fontSize: 12 }} className="muted">
                Clave
              </th>
              <th style={{ padding: "6px 8px", fontSize: 12 }} className="muted">
                Valores
              </th>
              <th style={{ padding: "6px 8px", fontSize: 12, width: 40 }} className="muted">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const draft = newValue[key.id] ?? { name: "", color: "RED" };
              const expanded = expandedKeyId === key.id;
              return (
                <tr key={key.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", verticalAlign: "top" }}>
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
                      />
                    ) : (
                      <button
                        className="btn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                        }}
                        onClick={() => startEditKey(key)}
                        aria-label={`Editar clave ${key.name}`}
                      >
                        {key.name}
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>

                  <td style={{ padding: "8px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {key.values.map((v) => (
                        <span
                          key={v.id}
                          className={`label-chip label-${v.color.toLowerCase()}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
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
                        className="icon-btn"
                        aria-label={`Agregar valor a ${key.name}`}
                        onClick={() => setExpandedKeyId(expanded ? null : key.id)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {expanded && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input
                          value={draft.name}
                          onChange={(e) =>
                            setNewValue((prev) => ({
                              ...prev,
                              [key.id]: { ...draft, name: e.target.value },
                            }))
                          }
                          placeholder="Nuevo valor"
                          onKeyDown={(e) => e.key === "Enter" && void addValue(key.id)}
                        />
                        <select
                          value={draft.color}
                          onChange={(e) =>
                            setNewValue((prev) => ({
                              ...prev,
                              [key.id]: { ...draft, color: e.target.value },
                            }))
                          }
                        >
                          {COLORS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <button className="btn" onClick={() => void addValue(key.id)}>
                          Agregar
                        </button>
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "8px", verticalAlign: "top" }}>
                    <button
                      className="icon-btn"
                      aria-label={`Eliminar clave ${key.name}`}
                      onClick={() => void deleteKey(key.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="dialog-field">
        <label htmlFor="la-new-key">Nueva clave</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            id="la-new-key"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Ej.: Prioridad"
            onKeyDown={(e) => e.key === "Enter" && void createKey()}
          />
          <button className="btn" onClick={() => void createKey()}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
