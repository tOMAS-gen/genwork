import { describe, expect, it } from "vitest";
import { deriveParentStatusId } from "@/lib/domain/tasks/parentStatus";
import type { TaskStatusRef } from "@/lib/domain/tasks/statusResolution";

const SET: TaskStatusRef[] = [
  { id: "pendiente", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS", sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
  { id: "en-curso", name: "En curso", color: "#3b82f6", type: "IN_PROGRESS", sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
  { id: "hecha", name: "Hecha", color: "#22c55e", type: "FINAL", sortOrder: 2, groupId: null, ownerId: null, sectorId: null },
];

const child = (type: "IN_PROGRESS" | "FINAL") => ({ status: { type } });

describe("deriveParentStatusId", () => {
  it("sin hijas no propone ningún cambio", () => {
    expect(deriveParentStatusId([], { id: "pendiente", type: "IN_PROGRESS" }, SET)).toBeNull();
  });

  it("todas las hijas finalizadas cierra al padre", () => {
    expect(
      deriveParentStatusId([child("FINAL"), child("FINAL")], { id: "en-curso", type: "IN_PROGRESS" }, SET),
    ).toBe("hecha");
  });

  it("una hija abierta reabre al padre en el primer IN_PROGRESS", () => {
    expect(
      deriveParentStatusId([child("FINAL"), child("IN_PROGRESS")], { id: "hecha", type: "FINAL" }, SET),
    ).toBe("pendiente");
  });

  it("no toca al padre que ya está del lado correcto de la frontera", () => {
    expect(
      deriveParentStatusId([child("IN_PROGRESS")], { id: "en-curso", type: "IN_PROGRESS" }, SET),
    ).toBeNull();
    expect(
      deriveParentStatusId([child("FINAL")], { id: "hecha", type: "FINAL" }, SET),
    ).toBeNull();
  });

  it("compara por type, no por id: hijas de otro conjunto de estados", () => {
    const hijasDeOtroSector = [{ status: { type: "FINAL" as const } }, { status: { type: "FINAL" as const } }];
    expect(
      deriveParentStatusId(hijasDeOtroSector, { id: "pendiente", type: "IN_PROGRESS" }, SET),
    ).toBe("hecha");
  });
});
