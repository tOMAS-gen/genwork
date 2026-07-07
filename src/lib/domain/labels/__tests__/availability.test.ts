import { describe, it, expect } from "vitest";
import { labelScopeOf, canAssignLabel, type ScopeKey } from "@/lib/domain/labels/availability";

const scope = (groupId: string | null, ownerId: string | null): ScopeKey => ({
  groupId,
  ownerId,
});

describe("labelScopeOf", () => {
  it("sin groupId ni ownerId es global", () => {
    expect(labelScopeOf(scope(null, null))).toBe("global");
  });

  it("con groupId es de grupo", () => {
    expect(labelScopeOf(scope("g1", null))).toBe("group");
  });

  it("con ownerId (sin groupId) es personal", () => {
    expect(labelScopeOf(scope(null, "u1"))).toBe("personal");
  });
});

describe("canAssignLabel — regla FR-005/R5", () => {
  it("etiqueta global se asigna a work de grupo", () => {
    expect(canAssignLabel(scope(null, null), scope("g1", null))).toBe(true);
  });

  it("etiqueta global se asigna a work personal", () => {
    expect(canAssignLabel(scope(null, null), scope(null, "u1"))).toBe(true);
  });

  it("etiqueta de grupo g1 se asigna a work del mismo grupo g1", () => {
    expect(canAssignLabel(scope("g1", null), scope("g1", null))).toBe(true);
  });

  it("etiqueta de grupo g1 NO se asigna a work de otro grupo g2", () => {
    expect(canAssignLabel(scope("g1", null), scope("g2", null))).toBe(false);
  });

  it("etiqueta personal de u1 se asigna a work personal de u1", () => {
    expect(canAssignLabel(scope(null, "u1"), scope(null, "u1"))).toBe(true);
  });

  it("etiqueta personal de u1 NO se asigna a work personal de u2", () => {
    expect(canAssignLabel(scope(null, "u1"), scope(null, "u2"))).toBe(false);
  });

  it("etiqueta de grupo NO se asigna a work personal", () => {
    expect(canAssignLabel(scope("g1", null), scope(null, "u1"))).toBe(false);
  });

  it("etiqueta personal NO se asigna a work de grupo", () => {
    expect(canAssignLabel(scope(null, "u1"), scope("g1", null))).toBe(false);
  });

  it("etiqueta global se asigna a work también global (sin grupo ni owner)", () => {
    expect(canAssignLabel(scope(null, null), scope(null, null))).toBe(true);
  });
});

describe("SC-005/FR-013 — ámbito global vs grupo/personal (gate de administración)", () => {
  it("una clave sin groupId ni ownerId es de ámbito global, distinto de grupo y personal", () => {
    const clave = scope(null, null);
    expect(labelScopeOf(clave)).toBe("global");
    expect(labelScopeOf(clave)).not.toBe("group");
    expect(labelScopeOf(clave)).not.toBe("personal");
  });

  it("una etiqueta de grupo X creada por su admin (SC-005) es de ámbito group, no global", () => {
    // El admin de un grupo solo puede administrar etiquetas con groupId=X (nunca ambas null).
    const etiquetaDeGrupo = scope("g1", null);
    expect(labelScopeOf(etiquetaDeGrupo)).toBe("group");
    expect(labelScopeOf(etiquetaDeGrupo)).not.toBe("global");
  });

  it("etiqueta de grupo X disponible en proyecto del grupo X pero no administrable como global", () => {
    const etiquetaDeGrupo = scope("g1", null);
    const workDelGrupo = scope("g1", null);
    const workGlobalSinGrupo = scope(null, null);
    expect(canAssignLabel(etiquetaDeGrupo, workDelGrupo)).toBe(true);
    // Una clave de grupo no es global: no corresponde a un "proyecto" sin ámbito (caso teórico de límite).
    expect(labelScopeOf(etiquetaDeGrupo)).not.toBe(labelScopeOf(workGlobalSinGrupo));
  });
});

describe("FR-009 (032-etiquetas-inline-tareas) — disponibilidad de $etiqueta en tareas", () => {
  // El ámbito de disponibilidad de una tarea es el ámbito de su trabajo/sector de contexto
  // (mismo ScopeKey que un work): globales + grupo propio, nunca de otro grupo.
  it("etiqueta global está disponible para una tarea de cualquier grupo", () => {
    const etiquetaGlobal = scope(null, null);
    const tareaDelGrupoA = scope("grupo-A", null);
    expect(canAssignLabel(etiquetaGlobal, tareaDelGrupoA)).toBe(true);
  });

  it("etiqueta del grupo A está disponible para una tarea cuyo trabajo es del grupo A", () => {
    const etiquetaDeGrupoA = scope("grupo-A", null);
    const tareaDelGrupoA = scope("grupo-A", null);
    expect(canAssignLabel(etiquetaDeGrupoA, tareaDelGrupoA)).toBe(true);
  });

  it("etiqueta del grupo A NUNCA está disponible para una tarea cuyo trabajo es del grupo B", () => {
    const etiquetaDeGrupoA = scope("grupo-A", null);
    const tareaDelGrupoB = scope("grupo-B", null);
    expect(canAssignLabel(etiquetaDeGrupoA, tareaDelGrupoB)).toBe(false);
  });

  it("etiqueta del grupo A NUNCA está disponible para una tarea suelta/personal sin ese grupo", () => {
    const etiquetaDeGrupoA = scope("grupo-A", null);
    const tareaPersonal = scope(null, "u1");
    expect(canAssignLabel(etiquetaDeGrupoA, tareaPersonal)).toBe(false);
  });
});
