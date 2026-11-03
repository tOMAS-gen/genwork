"use client";

import { Calendar } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/domain/dates/dueDate";
import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";

/**
 * Badge de fecha de entrega de un proyecto (FR: vencimiento en dashboard).
 * Muestra fecha corta (ej: "15 jul") + urgencia ("N días restantes" / "Vence hoy" / "Vencido")
 * con color según `getDueDateUrgency`. Sin fecha, no renderiza nada.
 */
export function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;

  const parsed = new Date(dueDate);
  const urgency = getDueDateUrgency(parsed);
  if (!urgency) return null;

  return (
    <span className={`due-badge due-${urgency.tone}`}>
      <Calendar size={14} />
      {formatDueDate(parsed, "short")} · {urgency.label}
    </span>
  );
}
