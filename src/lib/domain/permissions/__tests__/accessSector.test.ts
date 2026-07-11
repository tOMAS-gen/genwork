import { describe, it, expect } from "vitest";
import { accessSector, canAddress, type UserContext, type Scope } from "@/lib/domain/permissions";

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

describe("accessSector — regla FR-022 (SectorGrant individual, el sector no tiene ámbito propio)", () => {
  it("SUPERADMIN siempre opera cualquier sector, tenga o no grant", () => {
    const u = user({ globalRole: "SUPERADMIN" });
    expect(accessSector(u, "s1")).toBe("operate");
    expect(accessSector(u, "sector-inexistente")).toBe("operate");
  });

  it("usuario con SectorGrant sobre ese sector opera", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(u, "s1")).toBe("operate");
  });

  it("usuario sin grant sobre el sector no tiene acceso alguno", () => {
    const conGrantDeOtro = user({ grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(conGrantDeOtro, "s2")).toBe("none");
    expect(accessSector(user(), "s1")).toBe("none");
  });

  it("READER con grant NUNCA opera un sector (regla vigente: READER solo lee, jamás opera)", () => {
    const reader = user({ globalRole: "READER", grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(reader, "s1")).not.toBe("operate");
    expect(accessSector(reader, "s1")).toBe("none");
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
