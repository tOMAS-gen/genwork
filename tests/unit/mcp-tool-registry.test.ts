import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import type { GlobalRole, UserContext } from "@/lib/domain/permissions";
import type { McpAuth } from "@/server/mcp-auth";

/**
 * Guard de paridad MCP (constitución, Principio VIII).
 *
 * Registrar las herramientas no toca la base: los handlers son perezosos, así que
 * alcanza con un `prisma` vacío para recorrer `TOOL_REGISTRARS` y quedarse con los
 * nombres. Si alguien agrega una herramienta y no la documenta —o documenta una que
 * no existe— este test falla y la feature no entra.
 */
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

// `labels.ts` importa `@/server/guards`, que arrastra next-auth: acá sólo se
// registran herramientas, nunca se ejecutan sus handlers.
vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(),
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  DEV_AUTH_ENABLED: false,
  DEV_USERS: {},
}));

const { TOOL_REGISTRARS } = await import("@/lib/mcp/server");

const DOC_PATH = fileURLToPath(new URL("../../docs/mcp-tools.md", import.meta.url));
const START = "<!-- mcp-tools:start -->";
const END = "<!-- mcp-tools:end -->";

interface RegisteredTool {
  name: string;
  title?: string;
  description?: string;
}

function registeredTools(): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  const server = {
    registerTool: (name: string, config: { title?: string; description?: string }) => {
      tools.push({ name, title: config?.title, description: config?.description });
    },
  } as unknown as McpServer;

  const userContext: UserContext = {
    id: "user-1",
    globalRole: "SUPERADMIN" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  };
  const ctx: McpAuth = { userId: "user-1", connectionId: "conn-1", userContext };

  for (const register of TOOL_REGISTRARS) register(server, ctx);
  return tools;
}

/** Nombres de la primera columna de las tablas del bloque `mcp-tools` del inventario. */
function documentedTools(): string[] {
  const doc = readFileSync(DOC_PATH, "utf8");
  const start = doc.indexOf(START);
  const end = doc.indexOf(END);
  if (start === -1 || end === -1) {
    throw new Error(`docs/mcp-tools.md debe delimitar el inventario con ${START} y ${END}`);
  }

  const inventory = doc.slice(start + START.length, end);
  return [...inventory.matchAll(/^\|\s*`([a-zA-Z]+\.[a-zA-Z.]+)`\s*\|/gm)].map((m) => m[1]);
}

describe("paridad MCP: código ↔ docs/mcp-tools.md", () => {
  it("toda herramienta registrada está documentada en el inventario", () => {
    const undocumented = registeredTools()
      .map((t) => t.name)
      .filter((name) => !documentedTools().includes(name));

    expect(
      undocumented,
      `Herramientas MCP sin fila en docs/mcp-tools.md: ${undocumented.join(", ")}`,
    ).toEqual([]);
  });

  it("toda herramienta documentada existe en el código", () => {
    const names = new Set(registeredTools().map((t) => t.name));
    const ghosts = documentedTools().filter((name) => !names.has(name));

    expect(
      ghosts,
      `Documentadas en docs/mcp-tools.md pero no registradas: ${ghosts.join(", ")}`,
    ).toEqual([]);
  });

  it("el inventario no repite herramientas", () => {
    const documented = documentedTools();
    expect(documented).toHaveLength(new Set(documented).size);
  });

  it("no hay nombres de herramienta duplicados en el registro", () => {
    const names = registeredTools().map((t) => t.name);
    expect(names).toHaveLength(new Set(names).size);
  });

  it("toda herramienta declara título y descripción para el asistente", () => {
    const incomplete = registeredTools()
      .filter((t) => !t.title?.trim() || !t.description?.trim())
      .map((t) => t.name);

    expect(incomplete, `Sin title/description: ${incomplete.join(", ")}`).toEqual([]);
  });
});
