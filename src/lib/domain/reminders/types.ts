/**
 * Tipos compartidos del dominio de recordatorios (feature 036).
 * Alineados con prisma/schema.prisma y specs/036-recordatorios-calendario/data-model.md.
 */

export type ReminderScope = "INDIVIDUAL" | "GROUP" | "GLOBAL";

export type RecurrenceType = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "EVERY_N";

export type EveryUnit = "DAY" | "WEEK" | "MONTH";

export type ReminderLinkKind = "WORK" | "SECTOR" | "TASK";

export type DeliveryStatus = "PENDING" | "DISMISSED" | "SNOOZED";

export type EmailStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

/** Una antelación: N días antes de la ocurrencia + hora del día (minutos desde medianoche). */
export interface Lead {
  daysBefore: number; // 0 = mismo día
  minuteOfDay: number; // 0..1439
}

/** Regla de recurrencia + fecha base, para calcular ocurrencias. */
export interface RecurrenceRule {
  /** Fecha base de la ocurrencia (se usa su año/mes/día como fecha de calendario). */
  date: Date;
  recurrenceType: RecurrenceType;
  weekdays: number[]; // solo WEEKLY (0=lun..6=dom)
  everyN: number | null; // solo EVERY_N
  everyUnit: EveryUnit | null; // solo EVERY_N
  untilDate: Date | null; // fin opcional por fecha (inclusive)
  maxOccurrences: number | null; // fin opcional por cantidad
}

/** Entrada validada para crear/editar un recordatorio. */
export interface ReminderInput {
  title: string;
  description?: string | null;
  scope: ReminderScope;
  groupId?: string | null; // requerido si scope=GROUP
  date: string; // ISO
  recurrenceType: RecurrenceType;
  weekdays?: number[];
  everyN?: number | null;
  everyUnit?: EveryUnit | null;
  untilDate?: string | null;
  maxOccurrences?: number | null;
  linkType?: ReminderLinkKind | null;
  linkId?: string | null;
  leads: Lead[];
}
