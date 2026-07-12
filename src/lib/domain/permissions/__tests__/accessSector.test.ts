import { describe, it, expect } from "vitest";
import {
  access,
  accessSector,
  canAddress,
  canCreateSector,
  canManageGroup,
  type UserContext,
  type Scope,
  type SectorRef,
} from "@/lib/domain/permissions";

function user(partial: Partial<UserContext> = {}): UserContext {
  return {
    id: "u1",
    globalRole: "MEMBER",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    ...partial,
  };
}

const groupScope = (groupId = "g1"): Scope => ({ groupId, ownerId: null });
const personalScope = (ownerId = "u1"): Scope => ({ groupId: null, ownerId });
const globalScope = (): Scope => ({ groupId: null, ownerId: null });

const sector = (partial: Partial<SectorRef> & { id: string }): SectorRef => ({
  groupId: null,
  ownerId: null,
  ...partial,
});

describe("access — ámbito Global (feature 046: groupId y ownerId ambos null)", () => {
  it("cualquier usuario no-READER opera un recurso de ámbito Global", () => {
    expect(access(user(), globalScope())).toBe("operate");
    expect(access(user({ globalRole: "SUPERADMIN" }), globalScope())).toBe("operate");
  });

  it("READER solo lee el ámbito Global, jamás opera", () => {
    expect(access(user({ globalRole: "READER" }), globalScope())).toBe("read");
  });
});

describe("accessSector — feature 046 (sector con ámbito propio vía SectorRef)", () => {
  it("sector de un grupo del que el usuario es miembro → operate (por ámbito, sin grant)", () => {
    const u = user({ memberGroupIds: new Set(["g1"]) });
    const s = sector({ id: "s1", groupId: "g1" });
    expect(accessSector(u, s)).toBe("operate");
  });

  it("sector personal ajeno (ownerId de otro usuario) → none", () => {
    const u = user({ id: "u1" });
    const s = sector({ id: "s-personal-u2", ownerId: "u2" });
    expect(accessSector(u, s)).toBe("none");
  });

  it("SectorGrant puntual sobre un sector fuera de su ámbito natural → operate", () => {
    // El usuario no es miembro de g2 (ámbito natural del sector no lo cubre),
    // pero tiene un SectorGrant individual (FR-022) sobre ese sector puntual.
    const u = user({ memberGroupIds: new Set(["g1"]), grantedSectorIds: new Set(["s2"]) });
    const s = sector({ id: "s2", groupId: "g2" });
    expect(accessSector(u, s)).toBe("operate");
  });

  it("SUPERADMIN siempre opera cualquier sector, tenga o no grant/ámbito", () => {
    const u = user({ globalRole: "SUPERADMIN" });
    expect(accessSector(u, sector({ id: "s1", groupId: "g1" }))).toBe("operate");
    expect(accessSector(u, sector({ id: "sector-inexistente", groupId: "g9" }))).toBe("operate");
  });

  it("READER con grant NUNCA opera un sector (regla vigente: READER solo lee, jamás opera)", () => {
    const reader = user({ globalRole: "READER", grantedSectorIds: new Set(["s1"]) });
    const s = sector({ id: "s1", groupId: "g1" });
    expect(accessSector(reader, s)).not.toBe("operate");
    expect(accessSector(reader, s)).toBe("none");
  });

  it("usuario sin grant y sin ámbito sobre el sector no tiene acceso alguno", () => {
    const conGrantDeOtro = user({ grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(conGrantDeOtro, sector({ id: "s2", groupId: "g9" }))).toBe("none");
    expect(accessSector(user(), sector({ id: "s1", groupId: "g9" }))).toBe("none");
  });
});

describe("canCreateSector — feature 046 (crear sector en un ámbito dado)", () => {
  it("SUPERADMIN puede crear en cualquier ámbito (Grupo, Personal o Global)", () => {
    const u = user({ globalRole: "SUPERADMIN" });
    expect(canCreateSector(u, groupScope("g1"))).toBe(true);
    expect(canCreateSector(u, personalScope("u2"))).toBe(true);
    expect(canCreateSector(u, globalScope())).toBe(true);
  });

  it("el dueño puede crear un sector en SU ámbito Personal (no en el de otro)", () => {
    const u = user({ id: "u1" });
    expect(canCreateSector(u, personalScope("u1"))).toBe(true);
    expect(canCreateSector(u, personalScope("u2"))).toBe(false);
  });

  it("un ADMIN de grupo puede crear un sector en SU grupo (no en otro sin administrar)", () => {
    const admin = user({ adminGroupIds: new Set(["g1"]) });
    expect(canCreateSector(admin, groupScope("g1"))).toBe(true);
    expect(canCreateSector(admin, groupScope("g2"))).toBe(false);
    // Coherente con canManageGroup: mismo criterio de administración.
    expect(canManageGroup(admin, "g1")).toBe(true);
  });

  it("un no-SUPERADMIN nunca puede crear un sector en ámbito Global", () => {
    expect(canCreateSector(user(), globalScope())).toBe(false);
    expect(canCreateSector(user({ adminGroupIds: new Set(["g1"]) }), globalScope())).toBe(false);
    expect(canCreateSector(user({ globalRole: "READER" }), globalScope())).toBe(false);
  });
});

describe("canAddress — regla FR-038: direccionar ya no depende de grantedSectorGroupIds", () => {
  it("miembro del grupo direcciona works de ese grupo (memberGroupIds alcanza)", () => {
    const u = user({ memberGroupIds: new Set(["g1"]) });
    expect(canAddress(u, groupScope("g1"))).toBe(true);
  });

  it("un SectorGrant por sí solo (sin membresía de grupo) ya no habilita direccionar", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    expect(canAddress(u, groupScope("g1"))).toBe(false);
  });

  it("sin membresía ni grant ni nada: no direcciona; ámbito personal solo el dueño", () => {
    expect(canAddress(user(), groupScope("g1"))).toBe(false);
    expect(canAddress(user(), personalScope("u1"))).toBe(true);
    expect(canAddress(user(), personalScope("u2"))).toBe(false);
  });

  it("SUPERADMIN siempre direcciona; READER nunca", () => {
    expect(canAddress(user({ globalRole: "SUPERADMIN" }), groupScope("g1"))).toBe(true);
    expect(canAddress(user({ globalRole: "READER" }), groupScope("g1"))).toBe(false);
  });
});
