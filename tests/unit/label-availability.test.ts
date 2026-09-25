import { describe, it, expect } from "vitest";
import { canAssignLabel, isTaskLabelKeyAvailable, type ScopeKey } from "@/lib/domain/labels/availability";

/**
 * objetivos: al insertar una plantilla en otro proyecto, una `$etiqueta` de
 * tarea se copia solo si su clave está disponible en el destino (misma regla
 * que el `$` de saveTask: globales + grupo del proyecto, nunca personales).
 * Los casos de `canAssignLabel` viven en
 * src/lib/domain/labels/__tests__/availability.test.ts.
 */

const scope = (groupId: string | null, ownerId: string | null): ScopeKey => ({ groupId, ownerId });

const GLOBAL = scope(null, null);

describe("isTaskLabelKeyAvailable", () => {
  it("clave global → disponible en proyecto de grupo, personal y sin ámbito", () => {
    expect(isTaskLabelKeyAvailable(GLOBAL, scope("g1", null))).toBe(true);
    expect(isTaskLabelKeyAvailable(GLOBAL, scope(null, "u1"))).toBe(true);
    expect(isTaskLabelKeyAvailable(GLOBAL, GLOBAL)).toBe(true);
  });

  it("clave del mismo grupo que el proyecto → disponible", () => {
    expect(isTaskLabelKeyAvailable(scope("g1", null), scope("g1", null))).toBe(true);
  });

  it("clave de otro grupo → no", () => {
    expect(isTaskLabelKeyAvailable(scope("g1", null), scope("g2", null))).toBe(false);
  });

  it("clave de grupo en proyecto personal o sin ámbito → no", () => {
    expect(isTaskLabelKeyAvailable(scope("g1", null), scope(null, "u1"))).toBe(false);
    expect(isTaskLabelKeyAvailable(scope("g1", null), GLOBAL)).toBe(false);
  });

  it("clave personal con proyecto personal del mismo dueño → no (las de tarea nunca son personales)", () => {
    expect(isTaskLabelKeyAvailable(scope(null, "u1"), scope(null, "u1"))).toBe(false);
  });

  it("clave personal en proyecto de grupo → no", () => {
    expect(isTaskLabelKeyAvailable(scope(null, "u1"), scope("g1", null))).toBe(false);
  });

  it("una clave con grupo Y owner no cuenta como del grupo (el `$` solo busca ownerId null)", () => {
    expect(isTaskLabelKeyAvailable(scope("g1", "u1"), scope("g1", null))).toBe(false);
  });

  it("difiere de canAssignLabel justo en las claves personales", () => {
    const personal = scope(null, "u1");
    const personalWork = scope(null, "u1");
    expect(canAssignLabel(personal, personalWork)).toBe(true);
    expect(isTaskLabelKeyAvailable(personal, personalWork)).toBe(false);
  });
});
