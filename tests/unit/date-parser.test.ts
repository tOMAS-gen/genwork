import { describe, it, expect } from "vitest";
import { parseDates } from "@/lib/domain/dates/parser";

describe("parseDates — formato argentino DD/MM/AAAA", () => {
  it("01/02/2026 es 1 de febrero, no 2 de enero", () => {
    const [r] = parseDates("Entrega 01/02/2026");
    expect(r.day).toBe(1);
    expect(r.month).toBe(2);
    expect(r.year).toBe(2026);
    expect(r.iso).toBe("2026-02-01");
  });

  it("detecta fecha válida con separador /", () => {
    const [r] = parseDates("Entregar planos 20/07/2026 #Diseño");
    expect(r).toBeDefined();
    expect(r.day).toBe(20);
    expect(r.month).toBe(7);
    expect(r.year).toBe(2026);
    expect(r.start).toBe(16);
    expect(r.end).toBe(26);
  });

  it("detecta fecha válida con separador -", () => {
    const [r] = parseDates("Vencimiento 15-08-2026");
    expect(r).toBeDefined();
    expect(r.day).toBe(15);
    expect(r.month).toBe(8);
    expect(r.year).toBe(2026);
    expect(r.iso).toBe("2026-08-15");
  });
});

describe("parseDates — fechas inválidas", () => {
  it("31/02/2026 no existe → se descarta", () => {
    const r = parseDates("Reunión 31/02/2026");
    expect(r).toHaveLength(0);
  });

  it("32/01/2026 día fuera de rango → se descarta", () => {
    const r = parseDates("Tarea 32/01/2026");
    expect(r).toHaveLength(0);
  });

  it("30/02/2026 no existe (febrero no tiene 30) → se descarta", () => {
    const r = parseDates("Cita 30/02/2026");
    expect(r).toHaveLength(0);
  });

  it("00/01/2026 día cero inválido → se descarta", () => {
    const r = parseDates("Nota 00/01/2026");
    expect(r).toHaveLength(0);
  });

  it("15/13/2026 mes fuera de rango → se descarta", () => {
    const r = parseDates("Nota 15/13/2026");
    expect(r).toHaveLength(0);
  });
});

describe("parseDates — año fuera de rango", () => {
  it("año menor a 2000 se descarta", () => {
    const r = parseDates("Evento 15/08/1999");
    expect(r).toHaveLength(0);
  });

  it("año mayor a 2099 se descarta", () => {
    const r = parseDates("Evento 15/08/2100");
    expect(r).toHaveLength(0);
  });

  it("año límite 2000 es válido", () => {
    const r = parseDates("Evento 15/08/2000");
    expect(r).toHaveLength(1);
  });

  it("año límite 2099 es válido", () => {
    const r = parseDates("Evento 15/08/2099");
    expect(r).toHaveLength(1);
  });
});

describe("parseDates — múltiples fechas", () => {
  it("detecta ambas fechas mezclando separadores", () => {
    const r = parseDates("Tarea 15-08-2026 y 20/07/2026");
    expect(r).toHaveLength(2);
    expect(r[0].iso).toBe("2026-08-15");
    expect(r[1].iso).toBe("2026-07-20");
  });

  it("descarta la inválida y conserva la válida", () => {
    const r = parseDates("Reunión 31/02/2026 pero también 20/07/2026");
    expect(r).toHaveLength(1);
    expect(r[0].iso).toBe("2026-07-20");
  });
});

describe("parseDates — sin fechas", () => {
  it("texto sin fechas retorna array vacío", () => {
    const r = parseDates("Tarea genérica sin fecha #Diseño");
    expect(r).toHaveLength(0);
  });

  it("string vacío retorna array vacío", () => {
    const r = parseDates("");
    expect(r).toHaveLength(0);
  });
});
