import { describe, it, expect } from "vitest";
import {
  resolveApplicableStatusSet,
  initialStatus,
  finalStatus,
  reassignOnSectorChange,
  type TaskStatusRef,
} from "@/lib/domain/tasks/statusResolution";

function status(overrides: Partial<TaskStatusRef> & Pick<TaskStatusRef, "id" | "type">): TaskStatusRef {
  return {
    name: overrides.id,
    color: "#000000",
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
    ...overrides,
  };
}

describe("resolveApplicableStatusSet — research.md D2", () => {
  const groupDefault = [
    status({ id: "g-pendiente", type: "IN_PROGRESS", sortOrder: 0, groupId: "g1" }),
    status({ id: "g-hecha", type: "FINAL", sortOrder: 1, groupId: "g1" }),
  ];
  const sectorOverride = [
    status({ id: "s-asignado", type: "IN_PROGRESS", sortOrder: 0, sectorId: "sec1" }),
    status({ id: "s-realizada", type: "FINAL", sortOrder: 1, sectorId: "sec1" }),
  ];
  const all = [...groupDefault, ...sectorOverride];

  it("usa el override del sector EXEC si existe", () => {
    const set = resolveApplicableStatusSet(
      { execSector: { id: "sec1", groupId: "g1", ownerId: null }, workScope: null },
      all,
    );
    expect(set.map((s) => s.id)).toEqual(["s-asignado", "s-realizada"]);
  });

  it("cae al default del work si el sector EXEC no adaptó su conjunto (feature 044)", () => {
    // El sector es catálogo global: ya no aporta groupId/ownerId. Un sector EXEC sin
    // conjunto propio hereda el default del grupo/personal de SU trabajo (workScope).
    const set = resolveApplicableStatusSet(
      { execSector: { id: "sec-sin-override", groupId: null, ownerId: null }, workScope: { groupId: "g1", ownerId: null } },
      all,
    );
    expect(set.map((s) => s.id)).toEqual(["g-pendiente", "g-hecha"]);
  });

  it("sin sector EXEC, usa el default del scope del trabajo", () => {
    const set = resolveApplicableStatusSet({ execSector: null, workScope: { groupId: "g1", ownerId: null } }, all);
    expect(set.map((s) => s.id)).toEqual(["g-pendiente", "g-hecha"]);
  });

  it("respeta sortOrder al devolver el conjunto", () => {
    const shuffled = [groupDefault[1], groupDefault[0]];
    const set = resolveApplicableStatusSet({ execSector: null, workScope: { groupId: "g1", ownerId: null } }, shuffled);
    expect(set.map((s) => s.id)).toEqual(["g-pendiente", "g-hecha"]);
  });
});

describe("initialStatus/finalStatus", () => {
  const set = [
    status({ id: "a", type: "IN_PROGRESS", sortOrder: 1 }),
    status({ id: "b", type: "IN_PROGRESS", sortOrder: 0 }),
    status({ id: "c", type: "FINAL", sortOrder: 2 }),
  ];

  it("initialStatus devuelve el primer IN_PROGRESS por sortOrder", () => {
    expect(initialStatus(set).id).toBe("b");
  });

  it("finalStatus devuelve el único FINAL", () => {
    expect(finalStatus(set).id).toBe("c");
  });

  it("initialStatus tira error si no hay ningún IN_PROGRESS", () => {
    expect(() => initialStatus([status({ id: "c", type: "FINAL" })])).toThrow();
  });
});

describe("reassignOnSectorChange — FR-015", () => {
  const destino = [
    status({ id: "d-pendiente", type: "IN_PROGRESS", sortOrder: 0 }),
    status({ id: "d-en-proceso", type: "IN_PROGRESS", sortOrder: 1 }),
    status({ id: "d-hecha", type: "FINAL", sortOrder: 2 }),
  ];

  it("FINAL se reasigna al FINAL del destino", () => {
    const actual = status({ id: "otro-final", type: "FINAL" });
    expect(reassignOnSectorChange(actual, destino).id).toBe("d-hecha");
  });

  it("IN_PROGRESS se reasigna al primer IN_PROGRESS del destino", () => {
    const actual = status({ id: "otro-en-curso", type: "IN_PROGRESS" });
    expect(reassignOnSectorChange(actual, destino).id).toBe("d-pendiente");
  });

  it("si el estado actual ya pertenece al conjunto destino, no cambia", () => {
    const actual = destino[1];
    expect(reassignOnSectorChange(actual, destino).id).toBe("d-en-proceso");
  });
});
