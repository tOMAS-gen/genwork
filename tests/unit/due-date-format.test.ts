import { describe, it, expect } from "vitest";
import { formatDueDate } from "@/lib/domain/dates/dueDate";

// En Buenos Aires (UTC-3) la medianoche UTC todavía es el día anterior: es el
// caso que hacía que la lista mostrara un día menos que el detalle.
process.env.TZ = "America/Argentina/Buenos_Aires";

describe("formatDueDate — la entrega es un día de calendario", () => {
  it("medianoche UTC (lo que guarda el selector) es ese mismo día", () => {
    expect(formatDueDate("2026-10-29T00:00:00.000Z")).toBe("29/10/2026");
  });

  it("una hora cerca del cambio de día no lo corre al anterior", () => {
    expect(formatDueDate("2026-10-29T01:05:00.000Z")).toBe("29/10/2026");
  });

  it("una hora tarde sigue siendo el mismo día", () => {
    expect(formatDueDate("2026-10-29T23:30:00.000Z")).toBe("29/10/2026");
  });

  it("acepta un Date", () => {
    expect(formatDueDate(new Date(Date.UTC(2026, 9, 29)))).toBe("29/10/2026");
  });

  it("formato día/mes", () => {
    expect(formatDueDate("2026-10-29T00:00:00.000Z", "dayMonth")).toBe("29/10");
  });

  it("formato corto con mes en letras", () => {
    expect(formatDueDate("2026-10-29T00:00:00.000Z", "short")).toBe("29 oct");
  });
});
