import { describe, it, expect } from "vitest";
import { canManageMyDay, type Scope, type UserContext } from "@/lib/domain/permissions";
import { myDayProgress, myDaySourceLabel } from "@/lib/domain/tasks/myDayProgress";

/** Mi día: permiso de poner/quitar, progreso del día y etiqueta de origen. */

function user(partial: Partial<UserContext> = {}): UserContext {
  return {
    id: "u1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...partial,
  };
}

const group = (groupId = "g1"): Scope => ({ groupId, ownerId: null });
const personal = (ownerId = "u1"): Scope => ({ groupId: null, ownerId });
const global: Scope = { groupId: null, ownerId: null };
const inWork = (scope: Scope) => ({ workScope: scope, homeSector: null });
const inSector = (scope: Scope) => ({ workScope: null, homeSector: scope });

describe("canManageMyDay", () => {
  it("ADMIN del grupo sí; miembro común no", () => {
    expect(canManageMyDay(user({ memberGroupIds: new Set(["g1"]), adminGroupIds: new Set(["g1"]) }), inWork(group()))).toBe(true);
    expect(canManageMyDay(user({ memberGroupIds: new Set(["g1"]) }), inWork(group()))).toBe(false);
  });

  it("ADMIN de otro grupo no", () => {
    expect(canManageMyDay(user({ adminGroupIds: new Set(["g2"]) }), inWork(group("g1")))).toBe(false);
  });

  it("ámbito personal: solo el dueño", () => {
    expect(canManageMyDay(user(), inWork(personal("u1")))).toBe(true);
    expect(canManageMyDay(user(), inWork(personal("otro")))).toBe(false);
  });

  it("ámbito Global y tarea sin ámbito: solo super-admin", () => {
    expect(canManageMyDay(user(), inWork(global))).toBe(false);
    expect(canManageMyDay(user({ globalRole: "SUPERADMIN" }), inWork(global))).toBe(true);
    expect(canManageMyDay(user(), { workScope: null, homeSector: null })).toBe(false);
    expect(canManageMyDay(user({ globalRole: "SUPERADMIN" }), { workScope: null, homeSector: null })).toBe(true);
  });

  it("tarea suelta de sector: manda el ámbito del sector hogar", () => {
    expect(canManageMyDay(user({ adminGroupIds: new Set(["g1"]) }), inSector(group()))).toBe(true);
    expect(canManageMyDay(user({ memberGroupIds: new Set(["g1"]) }), inSector(group()))).toBe(false);
  });

  it("con proyecto, manda el proyecto aunque administre el sector hogar", () => {
    const admin = user({ adminGroupIds: new Set(["g-sector"]) });
    expect(canManageMyDay(admin, { workScope: group("g-work"), homeSector: group("g-sector") })).toBe(false);
  });

  it("READER y CLIENT nunca, aunque figuren como admin", () => {
    for (const globalRole of ["READER", "CLIENT"] as const) {
      expect(canManageMyDay(user({ globalRole, adminGroupIds: new Set(["g1"]) }), inWork(group()))).toBe(false);
      expect(canManageMyDay(user({ globalRole }), inWork(personal("u1")))).toBe(false);
    }
  });
});

describe("myDayProgress", () => {
  const pending = { status: { type: "IN_PROGRESS" as const } };
  const done = { status: { type: "FINAL" as const } };

  it("lista vacía", () => {
    expect(myDayProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("cuenta hojas y, de un contenedor, sus hijas (no el padre)", () => {
    const parent = { ...pending, subtasks: [done, pending, done] };
    expect(myDayProgress([pending, done, parent])).toEqual({ done: 3, total: 5 });
  });
});

describe("myDaySourceLabel", () => {
  it("proyecto › objetivo › tarea padre", () => {
    expect(
      myDaySourceLabel({
        work: { name: "Cartel" },
        homeSector: null,
        objective: { title: "Letras" },
        parentText: "Pintar letras",
      }),
    ).toBe("Cartel › Letras › Pintar letras");
  });

  it("tarea suelta: el sector hogar", () => {
    expect(myDaySourceLabel({ work: null, homeSector: { name: "Taller" } })).toBe("Taller");
  });

  it("sin origen: null", () => {
    expect(myDaySourceLabel({ work: null, homeSector: null })).toBeNull();
  });
});
