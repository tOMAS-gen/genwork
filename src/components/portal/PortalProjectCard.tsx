"use client";

import Link from "next/link";
import { Calendar } from "@/components/ui/icons";
import { progress } from "@/lib/domain/works/progress";
import { formatDueDate } from "@/lib/domain/dates/dueDate";
import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";
import type { PortalWorkSummary } from "./types";

/**
 * Tarjeta de proyecto del portal (feature 059, FR-015/FR-019).
 *
 * Reusa las clases de .card-interactive del sistema de diseño. No es ProjectCard
 * porque aquella trae botón de favorito, menú de acciones y enlace a la vista
 * interna: acá nada de eso existe.
 */

export function PortalProjectCard({ work }: { work: PortalWorkSummary }) {
  const primary = work.labels.find((l) => l.isPrimary) ?? null;
  const prog = progress(work.taskCounts.done, work.taskCounts.total);
  const due = work.dueDate ? new Date(work.dueDate) : null;
  const urgency = due ? getDueDateUrgency(due) : null;

  return (
    <Link href={`/portal/works/${work.id}`} className="card-interactive">
      <div className="card-header">
        {/* El nombre como título, como la app (spec 066, P33). */}
        <span className="pc-name">
          {primary && (
            <span className="pc-name-dot" style={{ background: primary.color }} aria-hidden="true" />
          )}
          {work.name}
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
            <div
              className={`pc-progress-fill${prog.pct === 100 ? " is-complete" : ""}`}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <span className="pc-progress-pct">
            {work.taskCounts.done}/{work.taskCounts.total} · {prog.pct}%
          </span>
        </div>
      )}

      {/* Pie: la fecha en mono y el plazo como chip (P33-M2, P33-M3). */}
      {due && urgency && (
        <div className="pc-due pc-due-footer">
          <span className="pc-due-date pc-due-mono">
            <Calendar size={16} />
            {formatDueDate(due)}
          </span>
          <span className={`pc-due-chip due-${urgency.tone}`}>{urgency.label}</span>
        </div>
      )}
    </Link>
  );
}
