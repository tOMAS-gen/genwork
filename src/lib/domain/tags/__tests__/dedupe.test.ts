import { describe, it, expect } from "vitest";
import { parseTags, tagsBySymbol } from "@/lib/domain/tags/parser";
import { tagMatchesName } from "@/lib/domain/tags/matching";

/**
 * T012 (US3, FR-005/FR-007) — reconciliación de `$etiqueta` sin montar DB.
 *
 * `resolveTask` en src/server/tasks.ts resuelve cada tag "$nombre" contra los
 * LabelValue disponibles y los acumula en un Map<keyId, valueId> (ver bloque
 * "--- `$etiqueta`" de resolveTask). Un Map con la misma key solo conserva el
 * último set(): por construcción, un texto con dos valores de la MISMA clave
 * termina resolviendo a un único valor por clave — la mecánica que después
 * persiste `saveTask` con deleteMany({ taskId }) + create(labelsData).
 *
 * Este test replica esa función pura de resolución (sin I/O) para probar la
 * dedupe/reconciliación de forma aislada, con fixtures de LabelValue en memoria.
 */

interface FixtureValue {
  id: string;
  keyId: string;
  name: string;
}

/** Misma lógica que el bloque `$etiqueta` de resolveTask (src/server/tasks.ts). */
function resolveLabelsByKey(
  rawText: string,
  availableValues: readonly FixtureValue[],
): Map<string, string> {
  const { tags } = parseTags(rawText);
  const grouped = tagsBySymbol(tags);
  const labelsByKey = new Map<string, string>();

  for (const name of grouped["$"]) {
    const matches = availableValues.filter((v) => tagMatchesName(name, v.name));
    const keyIds = new Set(matches.map((v) => v.keyId));
    if (matches.length === 0 || keyIds.size > 1) continue; // sin resolver / ambiguo
    const value = matches[0];
    labelsByKey.set(value.keyId, value.id);
  }

  return labelsByKey;
}

describe("resolución de $ — un valor por clave (FR-005/FR-007, US3)", () => {
  const values: FixtureValue[] = [
    { id: "v-alta", keyId: "k-prioridad", name: "Alta" },
    { id: "v-baja", keyId: "k-prioridad", name: "Baja" },
    { id: "v-urgente", keyId: "k-estado", name: "Urgente" },
  ];

  it("un solo $tag de una clave resuelve a esa clave/valor", () => {
    const result = resolveLabelsByKey("tarea $Alta", values);
    expect(result.size).toBe(1);
    expect(result.get("k-prioridad")).toBe("v-alta");
  });

  it("$tags repetidos de la MISMA clave (Alta luego Baja) dejan un único valor: el último (FR-007, cambiar de clave)", () => {
    const result = resolveLabelsByKey("tarea $Alta $Baja", values);
    expect(result.size).toBe(1);
    expect(result.get("k-prioridad")).toBe("v-baja");
  });

  it("$tags de distintas claves conviven (varias etiquetas de distintas claves, FR-005)", () => {
    const result = resolveLabelsByKey("tarea $Alta $Urgente", values);
    expect(result.size).toBe(2);
    expect(result.get("k-prioridad")).toBe("v-alta");
    expect(result.get("k-estado")).toBe("v-urgente");
  });

  it("quitar el $tag del texto no deja ninguna clave resuelta (US3.1 — reconciliación borra al re-guardar)", () => {
    const conEtiqueta = resolveLabelsByKey("tarea $Alta", values);
    expect(conEtiqueta.size).toBe(1);

    const sinEtiqueta = resolveLabelsByKey("tarea", values);
    expect(sinEtiqueta.size).toBe(0);
  });

  it("$tags repetidos de la misma clave y valor (Alta ... Alta) deduplican por nombre y dejan un único valor", () => {
    const result = resolveLabelsByKey("$Alta algo $Baja algo $Alta", values);
    expect(result.size).toBe(1);
    // tagsBySymbol dedupea por nombre normalizado antes de resolver: el orden final
    // de nombres distintos es [Alta, Baja] (la 2ª aparición de "Alta" ya está vista),
    // así que el último set() en el Map por clave es Baja.
    expect(result.get("k-prioridad")).toBe("v-baja");
  });
});
