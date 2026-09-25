"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { DeleteObjectiveMode } from "@/lib/domain/objectives/validation";

/**
 * Textos del diálogo según cuántas tareas tiene el objetivo (raíces + hijas).
 * Con 0 tareas no hay nada que decidir: un solo botón "Eliminar objetivo".
 */
export function deleteObjectiveCopy(
  title: string,
  taskCount: number,
): { message: string; deleteLabel: string; keepLabel: string | null } {
  if (taskCount <= 0) {
    return { message: `¿Eliminar el objetivo «${title}»? No tiene tareas.`, deleteLabel: "Eliminar objetivo", keepLabel: null };
  }
  const tasks = taskCount === 1 ? "1 tarea" : `${taskCount} tareas`;
  return {
    message: `«${title}» tiene ${tasks}. Podés eliminarlas junto con el objetivo o pasarlas a las tareas generales del proyecto.`,
    deleteLabel: taskCount === 1 ? "Eliminar con su tarea" : `Eliminar con sus ${taskCount} tareas`,
    keepLabel: "Pasar tareas a generales",
  };
}

/**
 * objetivos: "Eliminar objetivo…" del ⋮. Dos salidas explícitas (D8):
 * borrar sus tareas o pasarlas a generales. Cancelar tiene el foco inicial
 * para que un Enter apurado no borre nada. Si falla (ej. otra persona ya lo
 * borró), queda abierto con el error.
 */
export function DeleteObjectiveDialog({
  open,
  onClose,
  title,
  taskCount,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  taskCount: number;
  onConfirm: (mode: DeleteObjectiveMode) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSaving(false);
      setError("");
    }
  }, [open]);

  const copy = deleteObjectiveCopy(title, taskCount);

  const confirm = async (mode: DeleteObjectiveMode) => {
    setSaving(true);
    setError("");
    try {
      await onConfirm(mode);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Eliminar objetivo">
      <p style={{ margin: 0 }}>{copy.message}</p>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      <div className="dialog-actions objective-delete-actions">
        <button className="btn" autoFocus onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        {copy.keepLabel && (
          <button className="btn" disabled={saving} onClick={() => void confirm("moveToGeneral")}>
            {copy.keepLabel}
          </button>
        )}
        <button className="btn btn-danger" disabled={saving} onClick={() => void confirm("deleteTasks")}>
          {copy.deleteLabel}
        </button>
      </div>
    </Dialog>
  );
}
