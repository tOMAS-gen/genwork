"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import type { TaskDto } from "./TaskItem";

/** Candidata a padre: solo lo que hace falta para listarla y elegirla. */
interface CandidateTask {
  id: string;
  displayText: string;
  parentId: string | null;
}

/**
 * Selector de "Mover bajo otra tarea…" (062-subtareas, Tarea 13).
 *
 * No existe ningún endpoint que devuelva solo "las tareas raíz candidatas de
 * este proyecto o sector" — en vez de sumar uno nuevo solo para este picker,
 * se reusan los mismos endpoints que ya cargan la página completa
 * (`GET /api/works/[id]` o `GET /api/sectors/[id]/tasks`), fetch puntual al
 * abrir el diálogo. Se resuelve por el proyecto/sector PROPIO de `task`
 * (`task.workId`/`task.homeSector`), no por el `context` de la vista donde se
 * abrió el menú — una tarea puede listarse en una vista distinta a su hogar
 * (ej. una tarea de sector agrupada `byWork` en la vista de sector), y el
 * backend valida "misma pertenencia que el padre" contra el hogar real de la
 * tarea, no contra dónde se está mirando.
 */
export function TaskMoveDialog({
  open,
  onClose,
  task,
  onMoved,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskDto;
  onMoved: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCandidates(null);
    setError(null);
    const homeSectorId = task.homeSector?.id;
    const request = task.workId
      ? api<{ tasks: CandidateTask[] }>(`/api/works/${task.workId}`).then((w) => w.tasks)
      : homeSectorId
        ? api<{ loose: CandidateTask[] }>(`/api/sectors/${homeSectorId}/tasks`).then((v) => v.loose)
        : Promise.resolve([]);
    request
      .then((tasks) => setCandidates(tasks.filter((t) => t.id !== task.id && !t.parentId)))
      .catch((err) => setError((err as Error).message));
  }, [open, task.id, task.workId, task.homeSector?.id]);

  const move = async (parentId: string) => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ parentId }) });
      onMoved();
      onClose();
    } catch (err) {
      // El diálogo queda abierto con el error visible (ej. 400 "Sacá primero
      // las subtareas de esta tarea antes de moverla") — el backend ya valida
      // todo lo que hace falta, acá solo se muestra tal cual.
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Mover bajo otra tarea">
      {candidates === null && !error && <p className="muted">Cargando…</p>}
      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      {candidates && candidates.length === 0 && (
        <p className="muted">No hay otra tarea en este proyecto o sector para colgar esta tarea.</p>
      )}
      {candidates && candidates.length > 0 && (
        <div className="dialog-field" style={{ maxHeight: 280, overflowY: "auto" }}>
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              className="menu-item"
              disabled={saving}
              onClick={() => void move(c.id)}
            >
              {c.displayText}
            </button>
          ))}
        </div>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
