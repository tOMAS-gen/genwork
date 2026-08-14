"use client";

import Link from "next/link";
import { Calendar } from "@/components/ui/icons";
import { progress } from "@/lib/domain/works/progress";
import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";
import type { PortalWorkSummary } from "./types";

/**
 * Tarjeta de proyecto del portal (feature 059, FR-015/FR-019).
 *
 * Reusa las clases de .project-card del sistema de diseño. No es ProjectCard
 * porque aquella trae botón de favorito, menú de acciones y enlace a la vista
 * interna: acá nada de eso existe.
 */

const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function PortalProjectCard({ work }: { work: PortalWorkSummary }) {
  const primary = work.labels.find((l) => l.isPrimary) ?? null;
  const prog = progress(work.taskCounts.done, work.taskCounts.total);
  const due = work.dueDate ? new Date(work.dueDate) : null;
  const urgency = due ? getDueDateUrgency(due) : null;

  return (
    <Link href={`/portal/works/${work.id}`} className="project-card">
      <div className="card-header">
        <span
          className={`pc-name-pill ${primary ? "color-chip" : "pc-name-pill-default"}`}
          style={
            primary
              ? ({ "--c": primary.color, color: "var(--text)" } as React.CSSProperties)
              : undefined
          }
        >
          {work.name.toUpperCase()}
        </span>
      </div>

      {work.stage && <div className="pc-group">Etapa: {work.stage.name}</div>}

      {work.labels.length > 0 && (
        <div className="pc-labels">
          {work.labels.map((l) => (
            <span
              key={l.valueName}
              className="label-chip color-chip"
              style={{ "--c": l.color } as React.CSSProperties}
            >
              {l.valueName}
            </span>
          ))}
        </div>
      )}

      {prog && (
        <div className="pc-progress">
          <div
            role="progressbar"
            aria-valuenow={prog.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance del proyecto: ${prog.pct}%`}
            className="pc-progress-track"
          >
            <div className="pc-progress-fill" style={{ width: `${prog.pct}%` }} />
          </div>
          <span className="pc-progress-pct">{prog.pct}%</span>
        </div>
      )}

      {work.taskCounts.total > 0 && (
        <span className="pc-task-count">
          {work.taskCounts.done}/{work.taskCounts.total} tareas
        </span>
      )}

      {due && urgency && (
        <div className="pc-due">
          <span className="pc-due-date">
            <Calendar size={14} />
            Entrega: {dueDateFormatter.format(due)}
          </span>
          <span className={`pc-due-remaining due-${urgency.color}`} style={{ fontStyle: "italic" }}>
            {urgency.label}
          </span>
        </div>
      )}
    </Link>
  );
}
