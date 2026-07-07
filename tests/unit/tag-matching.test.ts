import { describe, it, expect } from "vitest";
import { toTagForm, tagMatchesName, matchByTag, canonical } from "@/lib/domain/tags/matching";

describe("tagMatchesName — espacio ≡ guion", () => {
  it("etiqueta con guiones matchea nombre con espacios y guiones mezclados", () => {
    expect(tagMatchesName("Tina-Remodelación-de-paneles", "Tina - Remodelación de paneles")).toBe(
      true,
    );
  });
});

describe("tagMatchesName — mayúsculas y acentos", () => {
  it("insensible a mayúsculas y acentos", () => {
    expect(tagMatchesName("obra-escuela-norte", "Obra Escuela Norte")).toBe(true);
  });
});

describe("tagMatchesName — nombres de una palabra", () => {
  it("igualdad exacta", () => {
    expect(tagMatchesName("Tina", "Tina")).toBe(true);
  });

  it("nombres distintos no matchean", () => {
    expect(tagMatchesName("Tina", "Tino")).toBe(false);
  });
});

describe("matchByTag — prefijo único", () => {
  it("resuelve por prefijo cuando hay un solo candidato posible", () => {
    const items = ["Obra Escuela Norte", "Tina"];
    const r = matchByTag("Obra", items, (i) => i);
    expect(r).toBe("Obra Escuela Norte");
  });
});

describe("matchByTag — prefijo ambiguo", () => {
  it("dos candidatos con el mismo prefijo → null", () => {
    const items = ["Obra Escuela Norte", "Obra Club Sur"];
    const r = matchByTag("Obra", items, (i) => i);
    expect(r).toBeNull();
  });
});

describe("matchByTag — igualdad exacta gana sobre prefijo", () => {
  it("prioriza el match exacto aunque exista otro candidato con prefijo", () => {
    const items = ["Tina", "Tina - Remodelación"];
    const r = matchByTag("Tina", items, (i) => i);
    expect(r).toBe("Tina");
  });
});

describe("matchByTag — sin candidatos", () => {
  it("lista vacía → null", () => {
    const r = matchByTag("Obra", [], (i: string) => i);
    expect(r).toBeNull();
  });
});

describe("toTagForm", () => {
  it("convierte espacios en guiones", () => {
    expect(toTagForm("Obra Escuela Norte")).toBe("Obra-Escuela-Norte");
  });

  it("símbolos raros se vuelven guiones, sin bordes ni repeticiones", () => {
    const r = toTagForm("Taller (Norte) #2");
    expect(r).toMatch(/^[\p{L}\p{N}_.-]+$/u);
    expect(r.startsWith("-")).toBe(false);
    expect(r.endsWith("-")).toBe(false);
    expect(r).not.toMatch(/--/);
  });

  it("nombres de una palabra quedan intactos", () => {
    expect(toTagForm("Metalurgica")).toBe("Metalurgica");
  });
});

/**
 * Resolución de `$etiqueta` (T009, 032-etiquetas-inline-tareas) — reproduce en dominio
 * puro el criterio de `resolveTask` en src/server/tasks.ts: entre los LabelValue
 * disponibles para el ámbito de la tarea, filtra por tagMatchesName(nombre, valor.name)
 * y desambigua contando cuántas claves (keyId) distintas aparecen entre los matches.
 * 0 matches o 2+ claves distintas → sin resolver (mismo camino que un tag no resuelto).
 */
describe("resolución de $etiqueta — match único / ambiguo / sin match (FR-005/FR-007)", () => {
  interface LabelValueLike {
    keyId: string;
    valueId: string;
    name: string;
  }

  function resolveLabelTag(tag: string, values: readonly LabelValueLike[]): LabelValueLike | null {
    const matches = values.filter((v) => tagMatchesName(tag, v.name));
    const keyIds = new Set(matches.map((v) => v.keyId));
    if (matches.length === 0 || keyIds.size > 1) return null;
    return matches[0];
  }

  it("match único: un solo valor coincide → resuelve esa clave/valor", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta", name: "Alta" },
      { keyId: "k-prioridad", valueId: "v-baja", name: "Baja" },
    ];
    const r = resolveLabelTag("Alta", values);
    expect(r).toEqual({ keyId: "k-prioridad", valueId: "v-alta", name: "Alta" });
  });

  it("ambigüedad: el mismo nombre existe en 2 claves distintas → no resuelve", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta", name: "Alta" },
      { keyId: "k-riesgo", valueId: "v-alta-riesgo", name: "Alta" },
    ];
    const r = resolveLabelTag("Alta", values);
    expect(r).toBeNull();
  });

  it("mismo nombre repetido dentro de la MISMA clave no cuenta como ambigüedad", () => {
    // Caso de borde: si por datos duplicados hay 2 valores con igual nombre en la
    // misma clave, sigue habiendo una sola clave involucrada (keyIds.size === 1).
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta-1", name: "Alta" },
      { keyId: "k-prioridad", valueId: "v-alta-2", name: "Alta" },
    ];
    const r = resolveLabelTag("Alta", values);
    expect(r).not.toBeNull();
    expect(r?.keyId).toBe("k-prioridad");
  });

  it("sin match: ningún valor disponible coincide con el nombre → no resuelve", () => {
    const values: LabelValueLike[] = [{ keyId: "k-prioridad", valueId: "v-alta", name: "Alta" }];
    const r = resolveLabelTag("Urgente", values);
    expect(r).toBeNull();
  });

  it("lista de valores disponibles vacía (ámbito sin etiquetas) → no resuelve", () => {
    const r = resolveLabelTag("Alta", []);
    expect(r).toBeNull();
  });

  it("match tolerante a mayúsculas/acentos/guion≡espacio también aplica a etiquetas de tarea", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-muy-urgente", name: "Muy Urgente" },
    ];
    const r = resolveLabelTag("muy-urgente", values);
    expect(r?.valueId).toBe("v-muy-urgente");
  });
});

describe("canonical — colapso de espacios/guiones usado por matchByTag", () => {
  it("espacios y guiones mezclados colapsan a la misma forma canónica", () => {
    expect(canonical("Tina - Remodelación")).toBe(canonical("tina remodelacion"));
  });
});

/**
 * T013 (Polish) — casos de borde adicionales de resolución de `$etiqueta` no cubiertos
 * por T009 arriba: acentos+mayúsculas combinados, prefijo único/ambiguo dentro de una
 * misma clave, valor inexistente, y nombres con espacios/guiones mezclados.
 */
describe("resolución de $etiqueta — casos de borde adicionales (T013)", () => {
  interface LabelValueLike {
    keyId: string;
    valueId: string;
    name: string;
  }

  function resolveLabelTag(tag: string, values: readonly LabelValueLike[]): LabelValueLike | null {
    return matchByTag(tag, values, (v) => v.name);
  }

  it("query con acentos y mayúsculas mezclados matchea valor sin acentos ($Práctica → practica)", () => {
    const values: LabelValueLike[] = [{ keyId: "k-tipo", valueId: "v-practica", name: "practica" }];
    const r = resolveLabelTag("Práctica", values);
    expect(r?.valueId).toBe("v-practica");
  });

  it("query en minúsculas sin acentos matchea valor con acentos y mayúsculas (PRÁCTICA)", () => {
    const values: LabelValueLike[] = [{ keyId: "k-tipo", valueId: "v-practica", name: "PRÁCTICA" }];
    const r = resolveLabelTag("practica", values);
    expect(r?.valueId).toBe("v-practica");
  });

  it("prefijo único dentro del ámbito de valores disponibles resuelve al único candidato", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta-riesgo", name: "Alta Riesgo" },
      { keyId: "k-riesgo", valueId: "v-bajo", name: "Bajo" },
    ];
    const r = resolveLabelTag("Alta", values);
    expect(r?.valueId).toBe("v-alta-riesgo");
  });

  it("prefijo ambiguo entre dos valores del ámbito → no resuelve", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta-riesgo", name: "Alta Riesgo" },
      { keyId: "k-prioridad", valueId: "v-alta-urgente", name: "Alta Urgente" },
    ];
    const r = resolveLabelTag("Alta", values);
    expect(r).toBeNull();
  });

  it("valor inexistente en el ámbito disponible no matchea nada", () => {
    const values: LabelValueLike[] = [{ keyId: "k-prioridad", valueId: "v-alta", name: "Alta" }];
    const r = resolveLabelTag("Inexistente", values);
    expect(r).toBeNull();
  });

  it("nombre de valor con guion ($Alta-Prioridad) matchea valor guardado con espacio (Alta Prioridad)", () => {
    const values: LabelValueLike[] = [
      { keyId: "k-prioridad", valueId: "v-alta-prioridad", name: "Alta Prioridad" },
    ];
    const r = resolveLabelTag("Alta-Prioridad", values);
    expect(r?.valueId).toBe("v-alta-prioridad");
  });
});
