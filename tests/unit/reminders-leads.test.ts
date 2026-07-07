import { describe, it, expect } from "vitest";
import { fireInstant } from "@/lib/domain/reminders/leads";

const cal = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const BA = "America/Argentina/Buenos_Aires"; // UTC-3, sin DST

describe("fireInstant", () => {
  it("mismo día 09:00 en Buenos Aires (UTC-3) → 12:00 UTC", () => {
    const t = fireInstant(cal(2026, 1, 10), { daysBefore: 0, minuteOfDay: 9 * 60 }, BA);
    expect(t.getTime()).toBe(Date.UTC(2026, 0, 10, 12, 0));
  });

  it("2 días antes 18:00 en Buenos Aires → resta 2 días y +3h UTC", () => {
    const t = fireInstant(cal(2026, 1, 10), { daysBefore: 2, minuteOfDay: 18 * 60 }, BA);
    expect(t.getTime()).toBe(Date.UTC(2026, 0, 8, 21, 0));
  });

  it("daysBefore cruza cambio de mes", () => {
    const t = fireInstant(cal(2026, 3, 1), { daysBefore: 2, minuteOfDay: 9 * 60 }, BA);
    // 1 mar - 2 días = 27 feb (2026 no bisiesto), 09:00 local → 12:00 UTC
    expect(t.getTime()).toBe(Date.UTC(2026, 1, 27, 12, 0));
  });

  it("zona UTC: sin desplazamiento", () => {
    const t = fireInstant(cal(2026, 1, 10), { daysBefore: 0, minuteOfDay: 10 * 60 }, "UTC");
    expect(t.getTime()).toBe(Date.UTC(2026, 0, 10, 10, 0));
  });
});
