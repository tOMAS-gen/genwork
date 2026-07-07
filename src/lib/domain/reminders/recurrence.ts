/**
 * recurrence.ts — cálculo puro de ocurrencias (research R3). Sin I/O.
 *
 * Las fechas de calendario se representan como Date a medianoche UTC
 * (`Date.UTC(y, m, d)`). El UTC no tiene DST, así que sumar días/meses es estable.
 * La hora real de disparo la resuelve `leads.ts` + `system-tz.ts`.
 */

import type { RecurrenceRule } from "./types";

const HARD_CAP = 10_000; // backstop contra series infinitas

/** Normaliza un Date a medianoche UTC de su día (usando sus componentes UTC). */
export function toCalDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Día de la semana con 0=lunes..6=domingo (a partir del getUTCDay 0=domingo). */
export function weekdayMon0(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Suma meses con clamp al último día del mes destino (ej. 31 ene + 1 mes → 28/29 feb). */
function addMonthsClamped(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const targetMonthTotal = m + n;
  const targetYear = y + Math.floor(targetMonthTotal / 12);
  const targetMonth = ((targetMonthTotal % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
}

/** Suma años con clamp (29 feb → 28 feb en años no bisiestos). */
function addYearsClamped(d: Date, n: number): Date {
  return addMonthsClamped(d, n * 12);
}

/**
 * Genera las ocurrencias (fechas de calendario, medianoche UTC) en orden
 * creciente a partir de la fecha base de la regla. Iterador acotado por HARD_CAP.
 */
export function* iterateOccurrences(rule: RecurrenceRule): Generator<Date> {
  const base = toCalDate(rule.date);
  const type = rule.recurrenceType;

  if (type === "ONCE") {
    yield base;
    return;
  }

  if (type === "WEEKLY") {
    const days = new Set(rule.weekdays);
    if (days.size === 0) return;
    let day = base;
    for (let i = 0; i < HARD_CAP; i++) {
      if (days.has(weekdayMon0(day))) yield day;
      day = addDays(day, 1);
    }
    return;
  }

  const everyN = rule.everyN ?? 1;
  for (let i = 0; i < HARD_CAP; i++) {
    let occ: Date;
    switch (type) {
      case "DAILY":
        occ = addDays(base, i);
        break;
      case "MONTHLY":
        occ = addMonthsClamped(base, i);
        break;
      case "YEARLY":
        occ = addYearsClamped(base, i);
        break;
      case "EVERY_N":
        if (rule.everyUnit === "DAY") occ = addDays(base, i * everyN);
        else if (rule.everyUnit === "WEEK") occ = addDays(base, i * everyN * 7);
        else occ = addMonthsClamped(base, i * everyN); // MONTH (default)
        break;
      default:
        return;
    }
    yield occ;
  }
}

/**
 * Ocurrencias dentro de [rangeStart, rangeEnd] (ambos fechas de calendario,
 * medianoche UTC, inclusive). Respeta el fin por `untilDate` y `maxOccurrences`
 * contando desde la fecha base.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const start = toCalDate(rangeStart).getTime();
  const end = toCalDate(rangeEnd).getTime();
  const until = rule.untilDate ? toCalDate(rule.untilDate).getTime() : null;
  const max = rule.maxOccurrences ?? null;

  const result: Date[] = [];
  let count = 0;
  for (const occ of iterateOccurrences(rule)) {
    if (max !== null && count >= max) break;
    const t = occ.getTime();
    if (until !== null && t > until) break;
    if (t > end) break;
    count++;
    if (t >= start) result.push(occ);
  }
  return result;
}
