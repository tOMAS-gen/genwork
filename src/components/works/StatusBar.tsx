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

    <div className="status-bar">
      <span>{done}/{total} tareas</span>

      {prog && (
        <>
          <div className="status-progress-track">
            <div className="status-progress-fill" style={{ width: `${prog.pct}%` }} />
          </div>
          <span>{prog.pct}%</span>
        </>
      )}

      <span className="status-separator" />
      {onDueDateChange ? (
        <DatePicker value={dateOnly} onChange={onDueDateChange} className="status-due" />
      ) : (
        dueDate && (
          <span className="status-due">
            {new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
              new Date(dueDate)
            )}
          </span>
        )
      )}
      {urgency && <span className={`due-${urgency.color}`}>{urgency.label}</span>}

      {stageProps ? (
        stageProps.currentStage && (
          <>
            <span className="status-separator" />
            <StageSelector {...stageProps} />
          </>
        )
      ) : (
        <>
          <span className="status-separator" />
          <span className={`status-pill ${status === "ACTIVE" ? "status-in_progress" : "status-pending"}`}>
            {status === "ACTIVE" ? "Activo" : "Archivado"}
          </span>
        </>
      )}
    </div>

  );
}
