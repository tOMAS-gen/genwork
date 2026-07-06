"use client";

import { Calendar } from "@/components/ui/icons";
import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});

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
    <span className={`due-badge due-${urgency.color}`}>
      <Calendar size={14} />
      {shortDateFormatter.format(parsed)} · {urgency.label}
    </span>
  );
}
