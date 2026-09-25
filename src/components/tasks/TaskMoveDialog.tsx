"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import type { TaskDto } from "./TaskItem";

/** Candidata a padre: solo lo que hace falta para listarla y elegirla. */
export interface CandidateTask {
  id: string;
  displayText: string;
  parentId: string | null;
  /** objetivos: sección de la candidata (null = generales). */
  objectiveId?: string | null;
}

export interface CandidateGroup {
  key: string;
  /** null = sin encabezado (proyecto sin objetivos o sector). */
  title: string | null;
  tasks: CandidateTask[];
}

/**
 * objetivos: agrupa las candidatas por sección ("Tareas generales" + un grupo
 * por objetivo, con la misma función de agrupado que la página). Descarta la
 * propia tarea y las hijas (el anidado es de un solo nivel) y omite grupos
 * vacíos. Sin objetivos devuelve un único grupo sin título, como antes.
 */
export function groupMoveCandidates(
  tasks: readonly CandidateTask[],
  objectives: readonly { id: string; title: string }[],
  excludeId: string,
): CandidateGroup[] {
  const candidates = tasks.filter((t) => t.id !== excludeId && !t.parentId);
  if (objectives.length === 0) {
    return candidates.length > 0 ? [{ key: "all", title: null, tasks: candidates }] : [];
  }
  const grouped = groupTasksByObjective(candidates, objectives);
  return [
    { key: "general", title: "Tareas generales", tasks: grouped.general },
    ...grouped.sections.map((s) => ({ key: s.objective.id, title: s.objective.title, tasks: s.tasks })),
  ].filter((g) => g.tasks.length > 0);
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
  const [groups, setGroups] = useState<CandidateGroup[] | null>(null);
  const [hasObjectives, setHasObjectives] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroups(null);
    setError(null);
    const homeSectorId = task.homeSector?.id;
    const request: Promise<{ tasks: CandidateTask[]; objectives: { id: string; title: string }[] }> =
      task.workId
        ? api<{ tasks: CandidateTask[]; objectives?: { id: string; title: string }[] }>(
            `/api/works/${task.workId}`,
          ).then((w) => ({ tasks: w.tasks, objectives: w.objectives ?? [] }))
        : homeSectorId
          ? api<{ loose: CandidateTask[] }>(`/api/sectors/${homeSectorId}/tasks`).then((v) => ({
              tasks: v.loose,
              objectives: [],
            }))
          : Promise.resolve({ tasks: [], objectives: [] });
    request
      .then(({ tasks, objectives }) => {
        setHasObjectives(objectives.length > 0);
        setGroups(groupMoveCandidates(tasks, objectives, task.id));
      })
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
      {groups === null && !error && <p className="muted">Cargando…</p>}
      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      {groups && groups.length === 0 && (
        <p className="muted">No hay otra tarea en este proyecto o sector para colgar esta tarea.</p>
      )}
      {groups && groups.length > 0 && hasObjectives && (
        <p className="muted" style={{ margin: 0 }}>
          Si elegís una tarea de otro objetivo, esta pasa a ese objetivo.
        </p>
      )}
      {groups && groups.length > 0 && (
        <div className="dialog-field" style={{ maxHeight: 280, overflowY: "auto" }}>
          {groups.map((g) => (
            <div key={g.key} role={g.title ? "group" : undefined} aria-label={g.title ?? undefined}>
              {g.title && <p className="task-move-group">{g.title}</p>}
              {g.tasks.map((c) => (
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
