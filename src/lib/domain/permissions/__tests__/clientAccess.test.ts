import { describe, it, expect } from "vitest";
import {
  access,
  accessWork,
  accessSector,
  canAddress,
  canClientRead,
  canCreateSector,
  canManageClientAccess,
  canManageGroup,
  canToggle,
  isWriterRole,
  taskAccess,
  type GlobalRole,
  type Scope,
  type SectorRef,
  type TaskRef,
  type UserContext,
} from "@/lib/domain/permissions";

/**
 * Feature 059 — un usuario con rol CLIENT no obtiene acceso por ámbito en ningún
 * caso (FR-002) y no puede ejecutar ninguna escritura (FR-003). Su única vía de
 * lectura es el ClientWorkGrant explícito por proyecto (FR-005).
 */

function ctx(over: Partial<UserContext> = {}): UserContext {
  return {
    id: "u1",
    globalRole: "CLIENT",
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
    ...over,
  };
}

const globalScope: Scope = { groupId: null, ownerId: null };
const groupScope: Scope = { groupId: "g1", ownerId: null };
const publicGroupScope: Scope = { groupId: "g1", ownerId: null, groupPublicRead: true };
const ownScope: Scope = { groupId: null, ownerId: "u1" };

const ALL_SCOPES: ReadonlyArray<readonly [string, Scope]> = [
  ["global", globalScope],
  ["grupo", groupScope],
  ["grupo con lectura pública", publicGroupScope],
  ["personal propio", ownScope],
  ["personal ajeno", { groupId: null, ownerId: "otro" }],
];

describe("isWriterRole", () => {
  const cases: ReadonlyArray<readonly [GlobalRole, boolean]> = [
    ["SUPERADMIN", true],
    ["MEMBER", true],
    ["READER", false],
    ["CLIENT", false],
  ];

  it.each(cases)("%s → %s", (role, expected) => {
    expect(isWriterRole(role)).toBe(expected);
  });
});

describe("access() — FR-002: el cliente no gana acceso por ámbito", () => {
  it.each(ALL_SCOPES)("ámbito %s → none", (_label, scope) => {
    expect(access(ctx(), scope)).toBe("none");
  });

  it("el ámbito global no le da operate aunque no sea READER", () => {
    // La rama de ámbito global devuelve "operate" a todo rol que no sea READER;
    // es la regresión que más importa cubrir.
    expect(access(ctx(), globalScope)).toBe("none");
    expect(access(ctx({ globalRole: "MEMBER" }), globalScope)).toBe("operate");
  });

  it("una membresía de grupo cargada por error no le da acceso", () => {
    expect(access(ctx({ memberGroupIds: new Set(["g1"]) }), groupScope)).toBe("none");
  });

  it("no hereda lectura de un grupo con lectura pública", () => {
    expect(access(ctx(), publicGroupScope)).toBe("none");
  });
});

describe("accessWork() — FR-005: alcance por proyecto otorgado", () => {
  it("devuelve read sobre el proyecto otorgado", () => {
    const user = ctx({ clientWorkIds: new Set(["w1"]) });
    expect(accessWork(user, { id: "w1", ...groupScope })).toBe("read");
  });

  it("devuelve none sobre un proyecto no otorgado", () => {
    const user = ctx({ clientWorkIds: new Set(["w2"]) });
    expect(accessWork(user, { id: "w1", ...groupScope })).toBe("none");
  });

  it("nunca devuelve operate, en ninguna combinación de ámbito y otorgamiento", () => {
    for (const [, scope] of ALL_SCOPES) {
      for (const granted of [true, false]) {
        const user = ctx({ clientWorkIds: new Set(granted ? ["w1"] : []) });
        expect(accessWork(user, { id: "w1", ...scope })).not.toBe("operate");
      }
    }
  });

  it("para un rol interno delega en access() sin cambiar el resultado", () => {
    const member = ctx({ globalRole: "MEMBER", memberGroupIds: new Set(["g1"]) });
    expect(accessWork(member, { id: "w1", ...groupScope })).toBe(access(member, groupScope));
    expect(accessWork(member, { id: "w1", ...globalScope })).toBe(access(member, globalScope));
  });

  it("un otorgamiento no le sirve a un rol interno como atajo", () => {
    // El grant es exclusivo del portal: un MEMBER sin acceso al grupo sigue sin acceso.
    const member = ctx({ globalRole: "MEMBER", clientWorkIds: new Set(["w1"]) });
    expect(accessWork(member, { id: "w1", ...groupScope })).toBe("none");
  });
});

describe("canClientRead()", () => {
  it("solo es cierto para un cliente con el proyecto otorgado", () => {
    expect(canClientRead(ctx({ clientWorkIds: new Set(["w1"]) }), "w1")).toBe(true);
    expect(canClientRead(ctx({ clientWorkIds: new Set(["w1"]) }), "w2")).toBe(false);
    expect(canClientRead(ctx(), "w1")).toBe(false);
  });

  it("es falso para un rol interno aunque tenga el otorgamiento cargado", () => {
    const member = ctx({ globalRole: "MEMBER", clientWorkIds: new Set(["w1"]) });
    expect(canClientRead(member, "w1")).toBe(false);
  });
});

describe("FR-003: el cliente no puede ejecutar ninguna escritura", () => {
  const sector: SectorRef = { id: "s1", ...groupScope };

  const task: TaskRef = {
    workScope: groupScope,
    homeSector: sector,
    execSectors: [sector],
    refSectors: [sector],
    refUserIds: new Set(["u1"]),
  };

  it("canToggle → false incluso estando referenciado en la tarea", () => {
    expect(canToggle(ctx(), task)).toBe(false);
  });

  it("canToggle → false con un SectorGrant cargado por error", () => {
    expect(canToggle(ctx({ grantedSectorIds: new Set(["s1"]) }), task)).toBe(false);
  });

  it("canAddress → false en todo ámbito", () => {
    for (const [, scope] of ALL_SCOPES) {
      expect(canAddress(ctx(), scope)).toBe(false);
    }
  });

  it("canCreateSector → false en ámbito personal propio", () => {
    // Sin el corte por rol, la rama de ámbito personal devuelve true para
    // cualquier usuario con id propio, y el gate HTTP no alcanzaba a frenarlo.
    expect(canCreateSector(ctx(), ownScope)).toBe(false);
    expect(canCreateSector(ctx({ globalRole: "READER" }), ownScope)).toBe(false);
    expect(canCreateSector(ctx({ globalRole: "MEMBER" }), ownScope)).toBe(true);
  });

  it("canCreateSector → false en ámbito de grupo y global", () => {
    expect(canCreateSector(ctx({ adminGroupIds: new Set(["g1"]) }), groupScope)).toBe(false);
    expect(canCreateSector(ctx(), globalScope)).toBe(false);
  });

  it("canManageGroup → false aunque figure como admin del grupo", () => {
    expect(canManageGroup(ctx({ adminGroupIds: new Set(["g1"]) }), "g1")).toBe(false);
  });

  it("accessSector → none aunque tenga un SectorGrant", () => {
    expect(accessSector(ctx({ grantedSectorIds: new Set(["s1"]) }), sector)).toBe("none");
  });

  it("taskAccess → none: una mención @ no le abre la tarea (FR-006)", () => {
    expect(taskAccess(ctx(), task)).toBe("none");
    expect(taskAccess(ctx({ clientWorkIds: new Set(["w1"]) }), task)).toBe("none");
  });
});

describe("canManageClientAccess — quién da acceso a clientes (FR-009)", () => {
  const member = (over: Partial<UserContext> = {}) => ctx({ globalRole: "MEMBER", ...over });

  it("un ADMIN del grupo puede sobre los proyectos de ESE grupo", () => {
    const admin = member({ memberGroupIds: new Set(["g1"]), adminGroupIds: new Set(["g1"]) });
    expect(canManageClientAccess(admin, groupScope)).toBe(true);
  });

  it("un ADMIN de otro grupo no puede", () => {
    const admin = member({ memberGroupIds: new Set(["g2"]), adminGroupIds: new Set(["g2"]) });
    expect(canManageClientAccess(admin, groupScope)).toBe(false);
  });

  it("un miembro común del grupo NO puede, aunque opere el proyecto", () => {
    // Es la diferencia con access(): operar el proyecto no habilita a decidir
    // quién lo ve desde afuera.
    const plain = member({ memberGroupIds: new Set(["g1"]) });
    expect(access(plain, groupScope)).toBe("operate");
    expect(canManageClientAccess(plain, groupScope)).toBe(false);
  });

  it("el dueño puede sobre su ámbito personal, y nadie más", () => {
    expect(canManageClientAccess(member(), ownScope)).toBe(true);
    expect(canManageClientAccess(member({ id: "otro" }), ownScope)).toBe(false);
  });

  it("el ámbito global es exclusivo del super-admin", () => {
    expect(canManageClientAccess(member({ adminGroupIds: new Set(["g1"]) }), globalScope)).toBe(false);
    expect(canManageClientAccess(ctx({ globalRole: "SUPERADMIN" }), globalScope)).toBe(true);
  });

  it("el super-admin puede en cualquier ámbito", () => {
    const su = ctx({ globalRole: "SUPERADMIN" });
    for (const [, scope] of ALL_SCOPES) {
      expect(canManageClientAccess(su, scope)).toBe(true);
    }
  });

  it("un cliente y un lector nunca pueden", () => {
    for (const role of ["CLIENT", "READER"] as const) {
      const u = ctx({ globalRole: role, adminGroupIds: new Set(["g1"]) });
      expect(canManageClientAccess(u, groupScope)).toBe(false);
      expect(canManageClientAccess(u, ownScope)).toBe(false);
    }
  });
});
