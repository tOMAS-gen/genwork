"use client";

import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { X } from "@/components/ui/icons";

export interface TaskDto {
  id: string;
  displayText: string;
  state: "PENDING" | "DONE";
  workId: string | null;
  work: { id: string; name: string } | null;
  homeSector: { id: string; name: string } | null;
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    sector: { id: string; name: string } | null;
    user: { id: string; name: string } | null;
  }[];
}

/**
 * Render de una tarea con etiquetas contextuales (FR-039): se omite la etiqueta
 * de la vista actual; cada etiqueta navega a su vista (FR-014).
 */
export function TaskItem({
  task,
  context,
  canToggle,
  onChanged,
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string };
  canToggle: boolean;
  onChanged: () => void;
}) {
  const toggle = async () => {
    try {
      await api(`/api/tasks/${task.id}/toggle`, { method: "POST" });
      onChanged();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const remove = async () => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    onChanged();
  };

  // FR-039: en la vista del trabajo se muestran # y @; en la del sector, /trabajo y @
  const showWorkTag = task.work && task.work.id !== context.workId;
  const visibleLinks = task.links.filter(
    (l) => !(l.targetType === "SECTOR" && l.sector?.id === context.sectorId),
  );

  return (
    <div className={`task ${task.state === "DONE" ? "done" : ""}`}>
      {canToggle ? (
        <input type="checkbox" checked={task.state === "DONE"} onChange={() => void toggle()} />
      ) : (
        <span className="muted" title="Se completa en su sector de ejecución">
          ◇
        </span>
      )}
      <span className="task-text" style={{ flex: 1 }}>
        {task.displayText}{" "}
        {showWorkTag && (
          <Link className="tag tag-work" href={`/works/${task.work!.id}`}>
            /{task.work!.name}
          </Link>
        )}{" "}
        {visibleLinks.map((l, i) =>
          l.targetType === "SECTOR" && l.sector ? (
            <Link
              key={i}
              className={`tag ${l.type === "EXEC" ? "tag-exec" : "tag-ref"}`}
              href={`/sectors/${l.sector.id}`}
            >
              {l.type === "EXEC" ? "#" : "@"}
              {l.sector.name}
            </Link>
          ) : l.user ? (
            <span key={i} className="tag tag-ref">
              @{l.user.name}
            </span>
          ) : null,
        )}
      </span>
      {canToggle && (
        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => void remove()} aria-label="Eliminar tarea">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
