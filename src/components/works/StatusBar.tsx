"use client";

import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";
import { progress } from "@/lib/domain/works/progress";
import { DatePicker } from "@/components/works/DatePicker";
import { StageSelector } from "@/components/works/StageSelector";

export function StatusBar({
  done,
  total,
  dueDate,
  status,
  onDueDateChange,
  stageProps,
}: {
  done: number;
  total: number;
  dueDate: string | null;
  status: "ACTIVE" | "ARCHIVED";
  onDueDateChange?: (iso: string | null) => void;
  stageProps?: {
    workId: string;
    groupId: string | null;
    currentStageId: string | null;
    currentStage: { id: string; name: string; color: string | null } | null;
    onChanged: () => void;
  };
}) {
  const dateOnly = dueDate ? dueDate.split("T")[0] : null;
  const parsedDue = dueDate ? new Date(dueDate) : null;
  const urgency = parsedDue ? getDueDateUrgency(parsedDue) : null;
  const prog = progress(done, total);

  return (
    <div className="work-status-bar">
      <div className="work-progress-summary">
        <span className="work-field-label">
          {status === "ARCHIVED" ? "Avance final" : "Avance"}
        </span>
        <div className="work-progress-values">
          <strong>{prog ? `${prog.pct}%` : "Sin tareas"}</strong>
          <span>
            {done} de {total} completadas
          </span>
        </div>
        {prog && (
          <div
            className="work-progress-track"
            role="progressbar"
            aria-label="Avance del proyecto"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={prog.pct}
          >
            <div className="work-progress-fill" style={{ width: `${prog.pct}%` }} />
          </div>
        )}
      </div>
      <div className="work-due-summary">
        <span className="work-field-label">Fecha límite</span>
        <div className="work-due-value">
          {onDueDateChange ? (
            <DatePicker value={dateOnly} onChange={onDueDateChange} />
          ) : (
            <span>
              {dueDate
                ? new Intl.DateTimeFormat("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(new Date(dueDate))
                : "Sin fecha"}
            </span>
          )}
          {urgency && <span className={`due-${urgency.color}`}>{urgency.label}</span>}
        </div>
      </div>
      {stageProps?.currentStage && (
        <div className="work-stage-summary">
          <span className="work-field-label">Etapa</span>
          <StageSelector {...stageProps} />
        </div>
      )}
    </div>
  );
}
