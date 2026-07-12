import { describe, it, expect } from "vitest";
import { scopeColumns, scopeOfStatus } from "@/server/taskStatus";
import type { TaskStatus } from "@prisma/client";

function taskStatus(overrides: Partial<TaskStatus>): TaskStatus {
  return {
    id: "ts1",
    name: "Pendiente",
    color: "#94a3b8",
    type: "IN_PROGRESS",
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
    createdAt: new Date(0),
    ...overrides,
  } as TaskStatus;
}

describe("scopeColumns", () => {
  it("scope de grupo → solo groupId", () => {
    expect(scopeColumns({ groupId: "g1" })).toEqual({ groupId: "g1", ownerId: null, sectorId: null });
  });

  it("scope personal → solo ownerId", () => {
    expect(scopeColumns({ ownerId: "u1" })).toEqual({ groupId: null, ownerId: "u1", sectorId: null });
  });

  it("scope de sector → solo sectorId", () => {
    expect(scopeColumns({ sectorId: "s1" })).toEqual({ groupId: null, ownerId: null, sectorId: "s1" });
  });

  it("scope global → los 3 campos null", () => {
    expect(scopeColumns({ global: true })).toEqual({ groupId: null, ownerId: null, sectorId: null });
  });
});

describe("scopeOfStatus", () => {
  it("estado de grupo", () => {
    expect(scopeOfStatus(taskStatus({ groupId: "g1" }))).toEqual({ groupId: "g1" });
  });

  it("estado personal", () => {
    expect(scopeOfStatus(taskStatus({ ownerId: "u1" }))).toEqual({ ownerId: "u1" });
  });

  it("estado de sector", () => {
    expect(scopeOfStatus(taskStatus({ sectorId: "s1" }))).toEqual({ sectorId: "s1" });
  });

  it("estado global (los 3 campos de scope null)", () => {
    expect(scopeOfStatus(taskStatus({}))).toEqual({ global: true });
  });
});
