"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { ColorField } from "@/components/ui/ColorField";
import { ArrowUp, ArrowDown, Trash2, Plus } from "@/components/ui/icons";

export type TaskStatusScope = { groupId: string } | { ownerId: string } | { sectorId: string } | { global: true };

interface TaskStatusDto {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
}

function scopeQuery(scope: TaskStatusScope): string {
  if ("groupId" in scope) return `groupId=${scope.groupId}`;
  if ("ownerId" in scope) return `ownerId=${scope.ownerId}`;
  if ("sectorId" in scope) return `sectorId=${scope.sectorId}`;
  return `global=true`;
}

/** Panel de administración de un conjunto de estados de tarea (feature 042, US1; 045 agrega permisos por canWrite). */
export function TaskStatusSettings({ scope, title = "Estados de tarea" }: { scope: TaskStatusScope; title?: string }) {
  const [statuses, setStatuses] = useState<TaskStatusDto[]>([]);
  const [inherited, setInherited] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"IN_PROGRESS" | "FINAL">("IN_PROGRESS");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{ inherited: boolean; canWrite: boolean; statuses: TaskStatusDto[] }>(
        `/api/task-statuses?${scopeQuery(scope)}`,
      );
      setStatuses(data.statuses);
      setInherited(data.inherited);
      setCanWrite(data.canWrite);
    } catch (err) {
      showToast({ message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeQuery(scope)]);

  const asSectorId = "sectorId" in scope ? scope.sectorId : undefined;

  const patch = async (id: string, data: Partial<Pick<TaskStatusDto, "name" | "color" | "type" | "sortOrder">>) => {
    try {
      await api(`/api/task-statuses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, ...(asSectorId ? { asSectorId } : {}) }),
      });
      await load();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  const remove = async (status: TaskStatusDto) => {
    const ok = await showConfirm(`¿Eliminar el estado "${status.name}"?`, {
      title: "Eliminar estado",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      const qs = new URLSearchParams({ confirm: "true", ...(asSectorId ? { asSectorId } : {}) });
      await api(`/api/task-statuses/${status.id}?${qs.toString()}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = statuses[index + direction];
    if (!target) return;
    const current = statuses[index];
    await Promise.all([
      patch(current.id, { sortOrder: target.sortOrder }),
      patch(target.id, { sortOrder: current.sortOrder }),
    ]);
  };

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await api("/api/task-statuses", {
        method: "POST",
        body: JSON.stringify({
          ...("groupId" in scope ? { groupId: scope.groupId } : {}),
          ...("ownerId" in scope ? { ownerId: scope.ownerId } : {}),
          ...("sectorId" in scope ? { sectorId: scope.sectorId } : {}),
          ...("global" in scope ? { global: true } : {}),
          name: newName.trim(),
          color: "#94a3b8",
          type: newType,
        }),
      });
      setNewName("");
      setNewType("IN_PROGRESS");
      await load();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  if (loading) return <div className="muted">Cargando estados…</div>;

  return (
    <div className="task-status-settings">
      <h3>{title}</h3>
      {inherited && (
        <p className="muted" style={{ fontSize: 13 }}>
          Usando el conjunto general de la organización. Cualquier cambio acá crea un conjunto
          propio para este sector, sin afectar a los demás.
        </p>
      )}

      <div className="task-status-list">
        {statuses.map((s, i) =>
          canWrite ? (
            <div key={s.id} className="task-status-row">
              <ColorField value={s.color} onChange={(hex) => void patch(s.id, { color: hex })} ariaLabel={`Color de ${s.name}`} />
              <input
                className="task-status-name-input"
                aria-label={`Nombre del estado ${s.name}`}
                defaultValue={s.name}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== s.name) void patch(s.id, { name: value });
                  else e.target.value = s.name;
                }}
              />
              <div className="segmented" role="group" aria-label="Tipo de estado">
                <button
                  type="button"
                  className={`segmented-btn${s.type === "IN_PROGRESS" ? " is-active" : ""}`}
                  onClick={() => void patch(s.id, { type: "IN_PROGRESS" })}
                >
                  En curso
                </button>
                <button
                  type="button"
                  className={`segmented-btn${s.type === "FINAL" ? " is-active" : ""}`}
                  onClick={() => void patch(s.id, { type: "FINAL" })}
                >
                  Final
                </button>
              </div>
              <button
                type="button"
                className="icon-btn min-h-[44px] min-w-[44px]"
                disabled={i === 0}
                onClick={() => void move(i, -1)}
                aria-label="Subir"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className="icon-btn min-h-[44px] min-w-[44px]"
                disabled={i === statuses.length - 1}
                onClick={() => void move(i, 1)}
                aria-label="Bajar"
              >
                <ArrowDown size={15} />
              </button>
              <button type="button" className="icon-btn min-h-[44px] min-w-[44px]" onClick={() => void remove(s)} aria-label="Eliminar">
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <div key={s.id} className="task-status-row task-status-row-readonly">
              <span className="task-status-color-dot" style={{ background: s.color }} aria-hidden="true" />
              <span className="task-status-name-readonly">{s.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {s.type === "IN_PROGRESS" ? "En curso" : "Final"}
              </span>
            </div>
          ),
        )}
      </div>

      {canWrite && (
        <div className="task-status-row task-status-new">
          <input
            className="task-status-name-input"
            placeholder="Nombre del estado nuevo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
          <div className="segmented" role="group" aria-label="Tipo del estado nuevo">
            <button
              type="button"
              className={`segmented-btn${newType === "IN_PROGRESS" ? " is-active" : ""}`}
              onClick={() => setNewType("IN_PROGRESS")}
            >
              En curso
            </button>
            <button
              type="button"
              className={`segmented-btn${newType === "FINAL" ? " is-active" : ""}`}
              onClick={() => setNewType("FINAL")}
            >
              Final
            </button>
          </div>
          <button type="button" className="icon-btn min-h-[44px] min-w-[44px]" onClick={() => void create()} aria-label="Agregar estado">
            <Plus size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
