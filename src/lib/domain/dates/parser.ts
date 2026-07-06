/**
 * Parser de fechas inline de genwork — función pura, sin I/O (Principio II).
 *
 * Formato argentino: DD/MM/AAAA o DD-MM-AAAA (día primero, mes segundo).
 *
 * Reglas:
 * - Regex \b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b detecta candidatos.
 * - Se valida que la fecha exista de verdad (ej. "31/02/2026" se descarta).
 * - Solo se aceptan años entre 2000 y 2099.
 * - Devuelve todas las fechas válidas encontradas; el llamador decide cuál usar
 *   (por convención, la primera se usa como dueDate).
 */

export interface ParsedDate {
  day: number;
  month: number;
  year: number;
  /** Offset de inicio del match dentro de rawText. */
  start: number;
  /** Offset exclusivo del final del match dentro de rawText. */
  end: number;
  /** Fecha en formato ISO "YYYY-MM-DD". */
  iso: string;
}

const DATE_RE = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g;

const MIN_YEAR = 2000;
const MAX_YEAR = 2099;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function parseDates(rawText: string): ParsedDate[] {
  const results: ParsedDate[] = [];

  for (const match of rawText.matchAll(DATE_RE)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (year < MIN_YEAR || year > MAX_YEAR) continue;

    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      continue;
    }

    const start = match.index ?? 0;
    const end = start + match[0].length;
    const iso = `${year}-${pad2(month)}-${pad2(day)}`;

    results.push({ day, month, year, start, end, iso });
  }

  return results;
}
