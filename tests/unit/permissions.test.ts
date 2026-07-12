import { describe, it, expect } from "vitest";
import {
  access,
  accessSector,
  canToggle,
  canAddress,
  taskAccess,
  canManageGroup,
  canRemoveMember,
  type UserContext,
  type Scope,
  type SectorRef,
  type TaskRef,
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

const groupScope = (groupId = "g1", publicRead = false): Scope => ({
  groupId,
  ownerId: null,
  groupPublicRead: publicRead,
});
const personalScope = (ownerId = "u1"): Scope => ({ groupId: null, ownerId });

/**
 * Sector suelto (SectorRef). Por defecto pertenece a un grupo ajeno ("g-ajeno",
 * donde el usuario de prueba no es miembro ni admin), de forma que el único
 * camino de acceso posible sea el SectorGrant puntual bajo prueba.
 */
const sectorRef = (id: string, overrides: Partial<Scope> = {}): SectorRef => ({
  id,
  groupId: "g-ajeno",
  ownerId: null,
  ...overrides,
});

const emptyTask = (partial: Partial<TaskRef> = {}): TaskRef => ({
  workScope: null,
  homeSector: null,
  execSectors: [],
  refSectors: [],
  refUserIds: new Set(),
  ...partial,
});

describe("access — reglas 1-4", () => {
  it("SUPERADMIN opera todo", () => {
    const u = user({ globalRole: "SUPERADMIN" });
    expect(access(u, groupScope())).toBe("operate");
    expect(access(u, personalScope("otro"))).toBe("operate");
  });

  it("ámbito personal: solo el dueño; nadie más ve nada", () => {
    expect(access(user(), personalScope("u1"))).toBe("operate");
    expect(access(user(), personalScope("u2"))).toBe("none");
  });

  it("miembro del grupo opera; no miembro sin publicRead no ve", () => {
    expect(access(user({ memberGroupIds: new Set(["g1"]) }), groupScope())).toBe("operate");
    expect(access(user(), groupScope())).toBe("none");
  });

  it("publicRead da solo lectura a no miembros", () => {
    expect(access(user(), groupScope("g1", true))).toBe("read");
  });

  it("READER nunca opera: read con publicRead o ReaderGrant, si no none", () => {
    const reader = user({ globalRole: "READER", readerGroupIds: new Set(["g2"]) });
    expect(access(reader, groupScope("g1", true))).toBe("read");
    expect(access(reader, groupScope("g2"))).toBe("read");
    expect(access(reader, groupScope("g3"))).toBe("none");
    // aunque fuera "miembro", READER no opera
    const readerMember = user({ globalRole: "READER", memberGroupIds: new Set(["g1"]) });
    expect(access(readerMember, groupScope("g1"))).toBe("none");
  });
});

describe("accessSector — permiso por sector suelto (FR-022)", () => {
  it("SectorGrant da operate sobre ese sector aunque no sea miembro de ningún grupo", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(u, sectorRef("s1"))).toBe("operate");
    expect(accessSector(u, sectorRef("s2"))).toBe("none");
  });

  it("READER no obtiene operate por grant", () => {
    const u = user({ globalRole: "READER", grantedSectorIds: new Set(["s1"]) });
    expect(accessSector(u, sectorRef("s1"))).not.toBe("operate");
  });
});

describe("canToggle — regla 5 (FR-011)", () => {
  it("operar el work habilita completar", () => {
    const u = user({ memberGroupIds: new Set(["g1"]) });
    expect(canToggle(u, emptyTask({ workScope: groupScope("g1") }))).toBe(true);
  });

  it("EXEC habilita, REF no", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    const s1 = sectorRef("s1");
    expect(canToggle(u, emptyTask({ execSectors: [s1] }))).toBe(true);
    expect(canToggle(u, emptyTask({ refSectors: [s1] }))).toBe(false);
  });

  it("READER jamás completa", () => {
    const u = user({ globalRole: "READER", memberGroupIds: new Set(["g1"]) });
    expect(canToggle(u, emptyTask({ workScope: groupScope("g1", true) }))).toBe(false);
  });

  it("tarea suelta se completa vía su sector hogar (SectorGrant, ya no por membresía de grupo)", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    expect(canToggle(u, emptyTask({ homeSector: sectorRef("s1") }))).toBe(true);
  });
});

describe("canAddress — regla 7 (FR-038): direccionar ≠ acceder", () => {
  it("un SectorGrant sin membresía de grupo ya no permite direccionar (los sectores perdieron ámbito propio)", () => {
    const u = user({ grantedSectorIds: new Set(["s1"]) });
    expect(canAddress(u, groupScope("g1"))).toBe(false);
    expect(access(u, groupScope("g1"))).toBe("none"); // tampoco puede abrir el work
  });

  it("sin ningún permiso en el grupo no direcciona; personal solo el dueño", () => {
    expect(canAddress(user(), groupScope("g1"))).toBe(false);
    expect(canAddress(user(), personalScope("u1"))).toBe(true);
    expect(canAddress(user(), personalScope("u2"))).toBe(false);
  });

  it("READER no direcciona", () => {
    const u = user({ globalRole: "READER", readerGroupIds: new Set(["g1"]) });
    expect(canAddress(u, groupScope("g1"))).toBe(false);
  });
});

describe("taskAccess — regla 8 (FR-042): visibilidad puntual por referencia", () => {
  it("REF a sector da read a quien opera ese sector, sin acceso al work", () => {
    const u = user({ grantedSectorIds: new Set(["s9"]) });
    const t = emptyTask({ workScope: groupScope("g1"), refSectors: [sectorRef("s9")] });
    expect(taskAccess(u, t)).toBe("read");
    expect(canToggle(u, t)).toBe(false);
  });

  it("REF a usuario da read a ese usuario", () => {
    const t = emptyTask({ workScope: groupScope("g1"), refUserIds: new Set(["u1"]) });
    expect(taskAccess(user(), t)).toBe("read");
  });

  it("sin vínculo alguno: none", () => {
    expect(taskAccess(user(), emptyTask({ workScope: groupScope("g1") }))).toBe("none");
  });
});

describe("grupos — regla 6 (FR-021)", () => {
  const group = { id: "g1", ownerId: "owner" };

  it("ADMIN administra; miembro común no", () => {
    expect(canManageGroup(user({ adminGroupIds: new Set(["g1"]) }), "g1")).toBe(true);
    expect(canManageGroup(user({ memberGroupIds: new Set(["g1"]) }), "g1")).toBe(false);
  });

  it("nadie quita al admin principal, ni otro ADMIN ni el SUPERADMIN", () => {
    const admin = user({ adminGroupIds: new Set(["g1"]) });
    const superadmin = user({ globalRole: "SUPERADMIN" });
    expect(canRemoveMember(admin, group, "owner")).toBe(false);
    expect(canRemoveMember(superadmin, group, "owner")).toBe(false);
    expect(canRemoveMember(admin, group, "otro")).toBe(true);
  });
});
