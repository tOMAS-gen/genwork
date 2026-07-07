/**
 * system-tz.ts — zona horaria única del sistema (research R4) y utilidades de
 * conversión wall-clock local ↔ UTC usando `Intl` nativo (sin librerías).
 *
 * Convención de "fecha de calendario": se representa como un Date a medianoche
 * UTC (Date.UTC(y, m, d)). El UTC no tiene DST, así que la aritmética de días
 * sobre esas fechas es estable. La hora real de disparo se calcula aparte con
 * `zonedTimeToUtc`, que sí aplica el offset de la tz (incluye DST).
 */

import { prisma } from "@/lib/db/client";

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Lee la zona horaria del sistema desde AccessConfig (fallback al default). */
export async function getSystemTimezone(): Promise<string> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  return config?.timezone || DEFAULT_TIMEZONE;
}

/**
 * Offset (en ms) que la zona `tz` está adelantada respecto de UTC en el instante
 * `date`. Positivo = al este de UTC. Método estándar con `formatToParts`.
 */
export function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return asUtc - date.getTime();
}

/**
 * Convierte una hora de pared local (año/mes/día/hora/minuto en la zona `tz`) al
 * instante UTC correspondiente. Refina una vez para resolver bordes de DST.
 */
export function zonedTimeToUtc(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  tz: string,
): Date {
  const utcGuess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offset1 = tzOffsetMs(new Date(utcGuess), tz);
  let ts = utcGuess - offset1;
  const offset2 = tzOffsetMs(new Date(ts), tz);
  if (offset2 !== offset1) ts = utcGuess - offset2;
  return new Date(ts);
}

/** Extrae la fecha de calendario (Y/M/D en `tz`) de un instante y la devuelve como medianoche UTC. */
export function calDateInTz(date: Date, tz: string): Date {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  return new Date(Date.UTC(map.year, map.month - 1, map.day));
}

/** Formatea un instante en la zona `tz` (es-AR) para mostrar en emails/UI. */
export function formatInTz(
  date: Date,
  tz: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: tz, ...opts }).format(date);
}
