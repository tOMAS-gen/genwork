import { describe, it, expect } from "vitest";
import { OBJECTIVE_SEPARATOR, objectiveBreadcrumb } from "@/lib/domain/objectives/breadcrumb";

/** objetivos: migaja "Proyecto › Objetivo" del tablero global y la TV. */

describe("objectiveBreadcrumb", () => {
  it("separador único ' › '", () => {
    expect(OBJECTIVE_SEPARATOR).toBe(" › ");
  });

  it("proyecto + objetivo → 'P › O'", () => {
    expect(objectiveBreadcrumb("Casa Pérez", "Instalación eléctrica")).toBe("Casa Pérez › Instalación eléctrica");
  });

  it("proyecto sin objetivo (tarea general) → solo el proyecto", () => {
    expect(objectiveBreadcrumb("Casa Pérez", null)).toBe("Casa Pérez");
    expect(objectiveBreadcrumb("Casa Pérez", "")).toBe("Casa Pérez");
  });

  it("sin proyecto → 'Sin proyecto' aunque venga un título de objetivo", () => {
    expect(objectiveBreadcrumb(null, null)).toBe("Sin proyecto");
    expect(objectiveBreadcrumb(null, "Huérfano")).toBe("Sin proyecto");
  });
});
