import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * Herramientas MCP de sectores (`sector.list`, `sector.get`) y su contraparte
 * administrativa (`admin.sector.update`/`delete`, `admin.sectorGrant.list`).
 * Mismo patrón de stub que mcp-group-list.test.ts.
 */

interface FakeSector {
  id: string;
  name: string;
  color: string | null;
  groupId: string | null;
  ownerId: string | null;
  group?: { id: string; name: string; publicRead: boolean } | null;
  owner?: { id: string; name: string | null } | null;
}

const db = vi.hoisted(() => ({
  sectors: [] as FakeSector[],
  grants: [] as { user: { id: string; name: string | null; email: string } }[],
}));

const sectorUpdate = vi.hoisted(() => vi.fn());
const sectorDelete = vi.hoisted(() => vi.fn());
const sectorFindFirst = vi.hoisted(() => vi.fn(async () => null as FakeSector | null));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findMany: vi.fn(async () => db.sectors),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.sectors.find((s) => s.id === id) ?? null,
      ),
      findFirst: (...args: unknown[]) => sectorFindFirst(...(args as [])),
      update: (...args: unknown[]) => sectorUpdate(...(args as [])),
      delete: (...args: unknown[]) => sectorDelete(...(args as [])),
    },
    task: { findMany: vi.fn(async () => []), count: vi.fn(async () => 2) },
    taskLink: { findMany: vi.fn(async () => []), count: vi.fn(async () => 7) },
    sectorGrant: { findMany: vi.fn(async () => db.grants) },
  },
}));

vi.mock("@/lib/mcp/activity", () => ({ logMcpActivity: vi.fn(async () => {}) }));
vi.mock("@/server/events", () => ({ emit: vi.fn() }));
vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(),
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  DEV_AUTH_ENABLED: false,
  DEV_USERS: {},
}));

const createConfirmation = vi.hoisted(() =>
  vi.fn(async () => ({
    confirmationToken: "token-1",
    summary: "resumen",
    expiresAt: "2026-01-01T00:00:00.000Z",
  })),
);
const consumeConfirmation = vi.hoisted(() => vi.fn(async () => ({ sectorId: "sector-1" })));

vi.mock("@/lib/mcp/confirmation", () => ({
  createConfirmation,
  consumeConfirmation,
  ConfirmationError: class ConfirmationError extends Error {},
}));

const { registerSectorTools } = await import("@/lib/mcp/tools/sectors");
const { registerAdminTools } = await import("@/lib/mcp/tools/admin");

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}>;

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const SECTOR_ID = "22222222-2222-4222-8222-222222222222";

function auth(globalRole: GlobalRole, overrides: Partial<UserContext> = {}): McpAuth {
  const userContext: UserContext = {
    id: "user-1",
    globalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
    ...overrides,
  };
  return { userId: "user-1", connectionId: "conn-1", userContext };
}

function handlersOf(register: (s: McpServer, c: McpAuth) => void, ctx: McpAuth) {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
  register(server, ctx);
  return handlers;
}

function call(
  register: (s: McpServer, c: McpAuth) => void,
  ctx: McpAuth,
  tool: string,
  input: Record<string, unknown> = {},
) {
  const handler = handlersOf(register, ctx).get(tool);
  if (!handler) throw new Error(`${tool} no registrada`);
  return handler(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.sectors = [
    {
      id: SECTOR_ID,
      name: "Producción",
      color: "#112233",
      groupId: GROUP_ID,
      ownerId: null,
      group: { id: GROUP_ID, name: "Genwork", publicRead: false },
      owner: null,
    },
    {
      id: "sector-personal",
      name: "Ideas",
      color: null,
      groupId: null,
      ownerId: "user-1",
      group: null,
      owner: { id: "user-1", name: "Tomás" },
    },
    {
      id: "sector-global",
      name: "Mantenimiento",
      color: null,
      groupId: null,
      ownerId: null,
      group: null,
      owner: null,
    },
    {
      id: "sector-ajeno",
      name: "Contabilidad",
      color: null,
      groupId: null,
      ownerId: "otro-usuario",
      group: null,
      owner: { id: "otro-usuario", name: "Otra" },
    },
  ];
  db.grants = [];
});

describe("sector.list", () => {
  it("dice a qué ámbito pertenece cada sector y los agrupa", async () => {
    const result = await call(registerSectorTools, auth("MEMBER", { memberGroupIds: new Set([GROUP_ID]) }), "sector.list");

    expect(result.content[0].text).toContain("Grupo Genwork: Producción");
    expect(result.content[0].text).toContain("Global: Mantenimiento");

    const sectors = result.structuredContent?.sectors as { id: string; scopeLabel: string; groupName: string | null }[];
    expect(sectors.map((s) => s.id).sort()).toEqual(["sector-global", "sector-personal", SECTOR_ID].sort());
    expect(sectors.find((s) => s.id === SECTOR_ID)).toMatchObject({
      groupName: "Genwork",
      scopeLabel: "Grupo Genwork",
      scope: { type: "GROUP", groupId: GROUP_ID, groupName: "Genwork" },
      access: "operate",
    });
    expect(sectors.find((s) => s.id === "sector-personal")).toMatchObject({
      scope: { type: "PERSONAL", ownerId: "user-1", ownerName: "Tomás" },
    });

    const byScope = result.structuredContent?.byScope as { label: string; sectors: { name: string }[] }[];
    expect(byScope.map((b) => b.label)).toEqual(["Grupo Genwork", "Personal de Tomás", "Global"]);
  });

  it("no filtra hacia adentro sectores personales ajenos", async () => {
    const result = await call(registerSectorTools, auth("MEMBER"), "sector.list");
    const sectors = result.structuredContent?.sectors as { id: string }[];
    expect(sectors.map((s) => s.id)).not.toContain("sector-ajeno");
  });

  it("filtra por tipo de ámbito y por grupo", async () => {
    const ctx = auth("SUPERADMIN");

    const soloGlobales = await call(registerSectorTools, ctx, "sector.list", { scope: "GLOBAL" });
    expect((soloGlobales.structuredContent?.sectors as { id: string }[]).map((s) => s.id)).toEqual([
      "sector-global",
    ]);

    const delGrupo = await call(registerSectorTools, ctx, "sector.list", { groupId: GROUP_ID });
    expect((delGrupo.structuredContent?.sectors as { id: string }[]).map((s) => s.id)).toEqual([SECTOR_ID]);
  });
});

describe("sector.get", () => {
  it("devuelve el detalle con ámbito y contadores", async () => {
    const result = await call(
      registerSectorTools,
      auth("MEMBER", { memberGroupIds: new Set([GROUP_ID]) }),
      "sector.get",
      { sectorId: SECTOR_ID },
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      id: SECTOR_ID,
      name: "Producción",
      scopeLabel: "Grupo Genwork",
      metrics: { total: 0, done: 0, pending: 0 },
    });
  });

  it("responde 'no encontrado' cuando el usuario no lo puede ver", async () => {
    const result = await call(registerSectorTools, auth("MEMBER"), "sector.get", { sectorId: SECTOR_ID });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Sector no encontrado");
  });
});

describe("admin.sector.update", () => {
  it("rechaza a quien no es administrador del sistema", async () => {
    const result = await call(registerAdminTools, auth("MEMBER"), "admin.sector.update", {
      sectorId: SECTOR_ID,
      name: "Fabricación",
    });

    expect(result.isError).toBe(true);
    expect(sectorUpdate).not.toHaveBeenCalled();
  });

  it("renombra conservando los vínculos", async () => {
    sectorUpdate.mockResolvedValueOnce({
      id: SECTOR_ID,
      name: "Fabricación",
      color: "#112233",
      groupId: GROUP_ID,
      ownerId: null,
    });

    const result = await call(registerAdminTools, auth("SUPERADMIN"), "admin.sector.update", {
      sectorId: SECTOR_ID,
      name: "Fabricación",
    });

    expect(result.isError).toBeUndefined();
    expect(sectorUpdate).toHaveBeenCalledWith({
      where: { id: SECTOR_ID },
      data: { name: "Fabricación" },
    });
    expect(result.structuredContent).toMatchObject({ name: "Fabricación", scope: { type: "GROUP" } });
  });

  it("rechaza un nombre ya usado en el mismo ámbito", async () => {
    sectorFindFirst.mockResolvedValueOnce({
      id: "otro",
      name: "Ventas",
      color: null,
      groupId: GROUP_ID,
      ownerId: null,
    });

    const result = await call(registerAdminTools, auth("SUPERADMIN"), "admin.sector.update", {
      sectorId: SECTOR_ID,
      name: "Ventas",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Ya existe un sector");
    expect(sectorUpdate).not.toHaveBeenCalled();
  });
});

describe("admin.sector.delete", () => {
  it("primero pide confirmación con el impacto y no borra nada", async () => {
    const result = await call(registerAdminTools, auth("SUPERADMIN"), "admin.sector.delete", {
      sectorId: SECTOR_ID,
    });

    expect(sectorDelete).not.toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({ status: "confirmation_required" });
    expect(createConfirmation).toHaveBeenCalledWith(
      "conn-1",
      "admin.sector.delete",
      { sectorId: SECTOR_ID },
      expect.stringContaining("7 vínculo(s) de tareas se desvincularán"),
    );
    expect(createConfirmation.mock.calls[0][3]).toContain("2 tarea(s) suelta(s) se eliminarán");
  });

  it("con el token borra el sector", async () => {
    consumeConfirmation.mockResolvedValueOnce({ sectorId: SECTOR_ID });

    const result = await call(registerAdminTools, auth("SUPERADMIN"), "admin.sector.delete", {
      sectorId: SECTOR_ID,
      confirmationToken: "9f1f0f2e-0000-4000-8000-000000000000",
    });

    expect(result.isError).toBeUndefined();
    expect(sectorDelete).toHaveBeenCalledWith({ where: { id: SECTOR_ID } });
  });
});

describe("admin.sectorGrant.list", () => {
  it("lista los accesos otorgados sobre el sector", async () => {
    db.grants = [{ user: { id: "user-2", name: "Ana", email: "ana@test.local" } }];

    const result = await call(registerAdminTools, auth("SUPERADMIN"), "admin.sectorGrant.list", {
      sectorId: SECTOR_ID,
    });

    expect(result.structuredContent).toMatchObject({
      sectorName: "Producción",
      grants: [{ userId: "user-2", name: "Ana", email: "ana@test.local" }],
    });
  });

  it("no lo expone a un usuario común", async () => {
    const result = await call(registerAdminTools, auth("MEMBER"), "admin.sectorGrant.list", {
      sectorId: SECTOR_ID,
    });

    expect(result.isError).toBe(true);
  });
});
