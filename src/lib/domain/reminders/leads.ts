/**
 * leads.ts — de (ocurrencia, antelación, tz) al instante UTC de disparo (research R6).
 *
 * La antelación es `daysBefore` (0 = mismo día) + `minuteOfDay` (hora local del día).
 * El instante de disparo = (fecha de ocurrencia − daysBefore) a esa hora local,
 * convertido a UTC con la zona del sistema.
 */

import { zonedTimeToUtc } from "@/lib/time/system-tz";
import { toCalDate } from "./recurrence";
import type { Lead } from "./types";

/** Instante UTC en que debe dispararse `lead` para una ocurrencia dada. */
export function fireInstant(occurrenceDate: Date, lead: Lead, tz: string): Date {
  const cal = toCalDate(occurrenceDate);
  const target = new Date(cal.getTime() - lead.daysBefore * 86_400_000);
  const hour = Math.floor(lead.minuteOfDay / 60);
  const minute = lead.minuteOfDay % 60;
  return zonedTimeToUtc(
    {
      year: target.getUTCFullYear(),
      month: target.getUTCMonth() + 1,
      day: target.getUTCDate(),
      hour,
      minute,
    },
    tz,
  );
}
