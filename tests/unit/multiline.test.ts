import { describe, it, expect } from "vitest";
import { splitTaskLines } from "@/lib/domain/tasks/multiline";

describe("splitTaskLines — bloc de notas (FR-105)", () => {
  it("texto de una línea → una tarea", () => {
    expect(splitTaskLines("Diseñar paneles")).toEqual(["Diseñar paneles"]);
  });

  it("varias líneas → una tarea por línea", () => {
    expect(splitTaskLines("Diseñar\nComprar\nAprobar")).toEqual([
      "Diseñar",
      "Comprar",
      "Aprobar",
    ]);
  });

  it("descarta líneas vacías y solo-espacios (pegado con hueco)", () => {
    expect(splitTaskLines("Diseñar\n\n  \nComprar")).toEqual(["Diseñar", "Comprar"]);
  });

  it("recorta espacios de cada línea", () => {
    expect(splitTaskLines("  Diseñar paneles  \n  Comprar #Compras ")).toEqual([
      "Diseñar paneles",
      "Comprar #Compras",
    ]);
  });

  it("soporta saltos de línea de Windows (\\r\\n)", () => {
    expect(splitTaskLines("A\r\nB")).toEqual(["A", "B"]);
  });

  it("texto vacío o solo espacios → sin tareas", () => {
    expect(splitTaskLines("")).toEqual([]);
    expect(splitTaskLines("   \n  ")).toEqual([]);
  });
});
