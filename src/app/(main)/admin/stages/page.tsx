"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Trash2, Plus, ArrowUp, ArrowDown } from "@/components/ui/icons";
import { usePageTitle } from "@/lib/usePageTitle";

interface GroupDto {
  id: string;
  name: string;
}

interface StageDto {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

const PALETTE: { value: string; label: string }[] = [
  { value: "#ef4444", label: "Rojo" },
  { value: "#f97316", label: "Naranja" },
  { value: "#f59e0b", label: "Ámbar" },
  { value: "#22c55e", label: "Verde" },
  { value: "#10b981", label: "Esmeralda" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Gris" },
  { value: "#92400e", label: "Marrón" },
];

/** Extrae el mensaje de un error lanzado por el helper `api` (contrato { error }). */
function errorMessage(err: unknown): string {
  const e = err as Error & { body?: { error?: { message?: string } } };
  return e.body?.error?.message ?? e.message ?? "Error inesperado";
}

function ColorSwatch({
  value,
  selected,
  onClick,
}: {
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Color ${value}`}
      aria-pressed={selected}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: value,
        border: selected ? "2px solid var(--text)" : "2px solid transparent",
        outline: selected ? "1px solid var(--surface)" : "none",
        cursor: "pointer",
        padding: 0,
      }}
    />
  );
}

/**
 * Administración de estados de producción (feature 012, US3): lista de stages
 * de un grupo con selector de color por paleta, alta, reorden (↑↓) y borrado.
 * Sigue el patrón visual de /admin/labels.
 */
export default function StagesAdminPage() {
  usePageTitle("Etapas");
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [groupId, setGroupId] = useState<string>("personal");
  const [stages, setStages] = useState<StageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PALETTE[0].value);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<GroupDto[]>("/api/groups");
        setGroups(data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadStages = async (gid: string) => {
    if (!gid) return;
    setLoading(true);
    setError("");
    try {
      const url = gid === "personal"
        ? "/api/stages?personal=true"
        : `/api/stages?groupId=${gid}`;
      const data = await api<StageDto[]>(url);
      setStages(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) void loadStages(groupId);
  }, [groupId]);

  const createStage = async () => {
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const body = groupId === "personal"
        ? { name, color: newColor, personal: true }
        : { name, color: newColor, groupId };
      await api("/api/stages", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewName("");
      await loadStages(groupId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const updateStageColor = async (stage: StageDto, color: string) => {
    setError("");
    try {
      await api(`/api/stages/${stage.id}`, {
        method: "PATCH",
        body: JSON.stringify({ color }),
      });
      await loadStages(groupId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deleteStage = async (id: string) => {
    setError("");
    try {
      await api(`/api/stages/${id}`, { method: "DELETE" });
      await loadStages(groupId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const moveStage = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStages(reordered);
    setError("");
    try {
      await api("/api/stages/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
    } catch (err) {
      setError(errorMessage(err));
      await loadStages(groupId);
    }
  };

  return (
    <div>
      <h1>Estados de producción</h1>

      <div className="dialog-field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label htmlFor="stages-group">Ámbito</label>
        <select
          id="stages-group"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="personal">Personal</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ display: "grid", gap: 16 }}>
        {loading && <p className="muted">Cargando…</p>}
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

        {!loading && stages.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            {groupId === "personal"
              ? "Todavía no hay estados personales configurados."
              : "Todavía no hay estados configurados en este grupo."}
          </p>
        )}

        {!loading && stages.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <span
                  className="stage-badge"
                  style={{ color: stage.color ?? "var(--muted)" }}
                >
                  <span className="stage-dot" style={{ background: stage.color ?? "var(--muted)" }} />
                  {stage.name}
                </span>

                <div style={{ display: "flex", gap: 4 }}>
                  {PALETTE.map((c) => (
                    <ColorSwatch
                      key={c.value}
                      value={c.value}
                      selected={stage.color === c.value}
                      onClick={() => void updateStageColor(stage, c.value)}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                  <button
                    className="icon-btn"
                    aria-label={`Subir ${stage.name}`}
                    disabled={index === 0}
                    onClick={() => void moveStage(index, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Bajar ${stage.name}`}
                    disabled={index === stages.length - 1}
                    onClick={() => void moveStage(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Eliminar ${stage.name}`}
                    onClick={() => void deleteStage(stage.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {groupId && (
          <div className="dialog-field">
            <label htmlFor="stage-new-name">Nuevo estado</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                id="stage-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej.: En producción"
                onKeyDown={(e) => e.key === "Enter" && void createStage()}
                style={{ minWidth: 200 }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {PALETTE.map((c) => (
                  <ColorSwatch
                    key={c.value}
                    value={c.value}
                    selected={newColor === c.value}
                    onClick={() => setNewColor(c.value)}
                  />
                ))}
              </div>
              <button className="btn" onClick={() => void createStage()}>
                <Plus size={14} />
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
