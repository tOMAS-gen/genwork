import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — suite negativa: qué NO puede hacer una cuenta de cliente.
 *
 * Estos tests son el contrato de seguridad de la feature. Cubren en particular los
 * dos agujeros que el diseño obligó a cerrar y que no eran evidentes:
 *
 *  1. Crear un sector o un proyecto de ámbito personal: la rama de ámbito personal
 *     del motor devolvía true para cualquier usuario con id propio, y el gate HTTP
 *     solo excluía al rol Lector.
 *  2. Emitir un token de asistente (MCP): esa ruta usaba el guard de sesión a secas,
 *     y /api/mcp está exento del middleware, así que era la vía de escape más limpia.
 *
 * Ambos aplicaban también al rol Lector: cerrarlos es una mejora neta.
 */

const authState = vi.hoisted(() => ({
  role: "CLIENT" as "CLIENT" | "MEMBER",
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: "client-1",
      email: "cliente@test.local",
      name: "Cliente de prueba",
      globalRole: authState.role,
    },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "client-1",
    globalRole: authState.role,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set(["work-1"]),
  })),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn(), subscribe: vi.fn(() => () => {}) }));
vi.mock("@/lib/storage/queue", () => ({ enqueue: vi.fn() }));

/**
 * Prisma vacío a propósito: si un guard fallara, la ruta llegaría a la base y el
 * test rompería con un error distinto de 403 — que es exactamente la señal que
 * queremos.
 */
vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null), count: vi.fn(async () => 0) },
    sector: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
    task: { findUnique: vi.fn(async () => null) },
    note: { findMany: vi.fn(async () => []) },
    mcpConnection: { findMany: vi.fn(async () => []), create: vi.fn() },
    clientWorkGrant: { findMany: vi.fn(async () => []) },
  },
}));

function post(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  authState.role = "CLIENT";
  vi.clearAllMocks();
});

describe("escritura denegada a una cuenta de cliente (FR-003)", () => {
  it("POST /api/works en ámbito personal → 403", async () => {
    const { POST } = await import("@/app/api/works/route");
    const res = await POST(post("http://localhost/api/works", { name: "Mío" }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("POST /api/sectors en ámbito personal → 403", async () => {
    const { POST } = await import("@/app/api/sectors/route");
    const res = await POST(post("http://localhost/api/sectors", { name: "Mío" }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("POST /api/tasks → 403", async () => {
    const { POST } = await import("@/app/api/tasks/route");
    const res = await POST(
      post("http://localhost/api/tasks", { rawText: "Una tarea" }),
      undefined as never,
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/notes → 403", async () => {
    const { POST } = await import("@/app/api/notes/route");
    const res = await POST(
      post("http://localhost/api/notes", { title: "x", content: "y" }),
      undefined as never,
    );
    expect(res.status).toBe(403);
  });
});

describe("la aplicación interna está cerrada para un cliente (FR-014)", () => {
  it("GET /api/board → 403", async () => {
    const { GET } = await import("@/app/api/board/route");
    const res = await GET(new Request("http://localhost/api/board"), undefined as never);
    expect(res.status).toBe(403);
  });

  it("GET /api/works/[id] → 403 incluso sobre un proyecto OTORGADO", async () => {
    // El otorgamiento sirve en /api/portal, no en la ruta interna: cada namespace
    // controla su propia forma de respuesta.
    const { GET } = await import("@/app/api/works/[id]/route");
    const res = await GET(new Request("http://localhost/api/works/work-1"), {
      params: Promise.resolve({ id: "work-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/works/[id]/files → 403 (la sección Archivos no existe para el cliente)", async () => {
    const { GET } = await import("@/app/api/works/[id]/files/route");
    const res = await GET(new Request("http://localhost/api/works/work-1/files"), {
      params: Promise.resolve({ id: "work-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/stream → 403 con el contrato de error, no 500", async () => {
    // Los SSE no pueden envolverse en withApi (devuelven un stream), así que el
    // error del guard hay que traducirlo a mano. Sin eso el rechazo salía como 500:
    // cerraba igual, pero indistinguible de una falla del servidor.
    const { GET } = await import("@/app/api/stream/route");
    const res = await GET();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("GET /api/me/references → 403", async () => {
    const { GET } = await import("@/app/api/me/references/route");
    const res = await GET(new Request("http://localhost/api/me/references"), undefined as never);
    expect(res.status).toBe(403);
  });

  it("POST /api/me/mcp-connections → 403 (no puede emitir credenciales de asistente)", async () => {
    const { POST } = await import("@/app/api/me/mcp-connections/route");
    const res = await POST(
      post("http://localhost/api/me/mcp-connections", { name: "mi asistente" }),
      undefined as never,
    );
    expect(res.status).toBe(403);
  });
});

describe("un rol interno sigue pasando los mismos guards (no regresión)", () => {
  it("GET /api/board no devuelve 403 para un MEMBER", async () => {
    authState.role = "MEMBER";
    const { GET } = await import("@/app/api/board/route");
    const res = await GET(new Request("http://localhost/api/board"), undefined as never);
    expect(res.status).not.toBe(403);
  });
});
