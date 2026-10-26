/**
 * Fecha de entrega (proyectos y tareas) como día de calendario.
 *
 * El selector guarda el día elegido a medianoche UTC (misma convención que
 * `src/lib/time/system-tz.ts`). Se muestra leyendo el día en UTC: si se pasara
 * a la hora local, en Argentina (UTC-3) saldría el día anterior.
 */

export type DueDateFormat = "full" | "dayMonth" | "short";

const formatters: Record<DueDateFormat, Intl.DateTimeFormat> = {
  full: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }),
  dayMonth: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
  short: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }),
};

/** "29/10/2026" (full), "29/10" (dayMonth) o "29 oct" (short). */
export function formatDueDate(value: string | Date, format: DueDateFormat = "full"): string {
  return formatters[format].format(typeof value === "string" ? new Date(value) : value);
}
