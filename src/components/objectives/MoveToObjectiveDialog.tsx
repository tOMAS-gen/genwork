"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Check } from "@/components/ui/icons";
import { moveTaskToObjective } from "./objectiveApi";

/**
 * objetivos (crítica I3): "Mover a objetivo…" desde el ⋮ de la tarjeta del
 * tablero. Es el acceso sin arrastrar (teclado y pantallas táctiles) a lo que
 * en la lista se hace soltando la tarea en otra sección. Lista simple de
 * botones —patrón `TaskMoveDialog`—, así se recorre con Tab y se elige con
 * Enter. La tarea va al final de la sección elegida, con sus subtareas.
 */
export function MoveToObjectiveDialog({
  open,
  onClose,
  task,
  objectives,
  onMoved,
}: {
  open: boolean;
  onClose: () => void;
  task: { id: string; displayText: string; objectiveId?: string | null };
  objectives: { id: string; title: string }[];
  onMoved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const current = task.objectiveId ?? null;
  const options: { id: string | null; title: string }[] = [
    { id: null, title: "Tareas generales" },
    ...objectives,
  ];

  const move = async (objectiveId: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await moveTaskToObjective(task.id, objectiveId);
      onMoved();
      onClose();
    } catch (err) {
      // Queda abierto con el motivo (ej. 403 sin permiso de operar el proyecto).
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Mover a objetivo">
      <p className="muted" style={{ margin: 0 }}>
        Elegí dónde va «{task.displayText}». Sus subtareas se mueven con ella.
      </p>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      <div className="objective-move-list" role="group" aria-label="Destino">
        {options.map((o) => {
          const isCurrent = o.id === current;
          return (
            <button
              key={o.id ?? "general"}
              type="button"
              className="menu-item"
              disabled={saving || isCurrent}
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => void move(o.id)}
            >
              <span className="objective-move-title">{o.title}</span>
              {isCurrent && (
                <span className="objective-move-current">
                  <Check size={14} aria-hidden="true" />
                  Actual
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
