import { describe, it, expect } from "vitest";
import { occurrencesBetween, weekdayMon0 } from "@/lib/domain/reminders/recurrence";
import type { RecurrenceRule } from "@/lib/domain/reminders/types";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const iso = (dt: Date) => dt.toISOString().slice(0, 10);

function rule(partial: Partial<RecurrenceRule> & { date: Date; recurrenceType: RecurrenceRule["recurrenceType"] }): RecurrenceRule {
  return {
    weekdays: [],
    everyN: null,
    everyUnit: null,
    untilDate: null,
    maxOccurrences: null,
    ...partial,
  };
}

describe("weekdayMon0", () => {
  it("mapea lunes=0 .. domingo=6", () => {
    expect(weekdayMon0(d(2024, 1, 1))).toBe(0); // lunes
    expect(weekdayMon0(d(2024, 1, 3))).toBe(2); // miércoles
    expect(weekdayMon0(d(2024, 1, 5))).toBe(4); // viernes
    expect(weekdayMon0(d(2024, 1, 7))).toBe(6); // domingo
  });
});

describe("occurrencesBetween", () => {
  it("ONCE: una sola ocurrencia si cae en el rango", () => {
    const r = rule({ date: d(2026, 1, 15), recurrenceType: "ONCE" });
    expect(occurrencesBetween(r, d(2026, 1, 1), d(2026, 1, 31)).map(iso)).toEqual(["2026-01-15"]);
    expect(occurrencesBetween(r, d(2026, 2, 1), d(2026, 2, 28))).toEqual([]);
  });

  it("DAILY: todos los días del rango desde la base", () => {
    const r = rule({ date: d(2026, 1, 1), recurrenceType: "DAILY" });
    expect(occurrencesBetween(r, d(2026, 1, 1), d(2026, 1, 4)).map(iso)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
  });

  it("WEEKLY multi-día (lun+mié+vie)", () => {
    const r = rule({ date: d(2024, 1, 1), recurrenceType: "WEEKLY", weekdays: [0, 2, 4] });
    expect(occurrencesBetween(r, d(2024, 1, 1), d(2024, 1, 7)).map(iso)).toEqual([
      "2024-01-01", // lun
      "2024-01-03", // mié
      "2024-01-05", // vie
    ]);
  });

  it("MONTHLY: clamp del día 31 en meses cortos", () => {
    const r = rule({ date: d(2023, 1, 31), recurrenceType: "MONTHLY" });
    expect(occurrencesBetween(r, d(2023, 1, 1), d(2023, 3, 31)).map(iso)).toEqual([
      "2023-01-31",
      "2023-02-28", // clamp (feb 2023 no bisiesto)
      "2023-03-31",
    ]);
  });

  it("YEARLY: 29 feb → 28 feb en año no bisiesto", () => {
    const r = rule({ date: d(2024, 2, 29), recurrenceType: "YEARLY" });
    expect(occurrencesBetween(r, d(2024, 1, 1), d(2025, 12, 31)).map(iso)).toEqual([
      "2024-02-29",
      "2025-02-28",
    ]);
  });

  it("EVERY_N cada 2 semanas", () => {
    const r = rule({ date: d(2024, 1, 1), recurrenceType: "EVERY_N", everyN: 2, everyUnit: "WEEK" });
    expect(occurrencesBetween(r, d(2024, 1, 1), d(2024, 1, 31)).map(iso)).toEqual([
      "2024-01-01",
      "2024-01-15",
      "2024-01-29",
    ]);
  });

  it("EVERY_N cada 3 meses", () => {
    const r = rule({ date: d(2024, 1, 15), recurrenceType: "EVERY_N", everyN: 3, everyUnit: "MONTH" });
    expect(occurrencesBetween(r, d(2024, 1, 1), d(2024, 12, 31)).map(iso)).toEqual([
      "2024-01-15",
      "2024-04-15",
      "2024-07-15",
      "2024-10-15",
    ]);
  });

  it("fin por untilDate (inclusive)", () => {
    const r = rule({ date: d(2026, 1, 1), recurrenceType: "DAILY", untilDate: d(2026, 1, 3) });
    expect(occurrencesBetween(r, d(2026, 1, 1), d(2026, 1, 31)).map(iso)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("fin por maxOccurrences (cuenta desde la base)", () => {
    const r = rule({ date: d(2026, 1, 1), recurrenceType: "DAILY", maxOccurrences: 2 });
    expect(occurrencesBetween(r, d(2026, 1, 1), d(2026, 1, 31)).map(iso)).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
  });
});
