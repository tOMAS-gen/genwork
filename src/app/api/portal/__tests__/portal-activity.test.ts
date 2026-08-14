import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — historial de avance del portal (US4).
 *
 * Cubre el gate por otorgamiento, la paginación por cursor y —lo más importante—
 * que la respuesta no incluya quién hizo cada cambio: no le aporta al cliente y
 * expone la asignación interna de trabajo con más detalle del necesario.
 */

const authState = vi.hoisted(() => ({
  role: "CLIENT" as "CLIENT" | "MEMBER",
  clientWorkIds: ["work-1"] as string[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "client-1", email: "c@test.local", name: "Cliente", globalRole: authState.role },
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
    clientWorkIds: new Set(authState.clientWorkIds),
  })),
}));

const db = vi.hoisted(() => ({ changes: [] as Record<string, unknown>[] }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    taskStatusChange: {
      findMany: vi.fn(async ({ take, cursor, skip }: { take: number; cursor?: { id: string }; skip?: number }) => {
        const start = cursor ? db.changes.findIndex((c) => c.id === cursor.id) + (skip ?? 0) : 0;
        return db.changes.slice(start, start + take);
      }),
    },
  },
}));

function makeChange(n: number) {
  return {
    id: `chg-${n}`,
    changedAt: new Date(2026, 0, n),
    task: { id: `task-${n}`, displayText: `Tarea ${n}` },
    fromStatus: { name: "Pendiente", color: "#94a3b8" },
    toStatus: { name: "Hecha", color: "#22c55e" },
  };
}

async function call(url: string) {
  const { GET } = await import("@/app/api/portal/works/[id]/activity/route");
  return GET(new Request(url), { params: Promise.resolve({ id: "work-1" }) });
}

beforeEach(() => {
  authState.role = "CLIENT";
  authState.clientWorkIds = ["work-1"];
  db.changes = Array.from({ length: 5 }, (_, i) => makeChange(i + 1));
  vi.clearAllMocks();
});

describe("GET /api/portal/works/[id]/activity", () => {
  it("devuelve las entradas con estado de origen y destino", async () => {
    const res = await call("http://localhost/api/portal/works/work-1/activity");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(5);
    expect(body.entries[0]).toMatchObject({
      taskId: "task-1",
      taskText: "Tarea 1",
      from: { name: "Pendiente" },
      to: { name: "Hecha" },
    });
    expect(body.nextCursor).toBeNull();
  });

  it("no expone quién hizo el cambio", async () => {
    const body = await (await call("http://localhost/api/portal/works/work-1/activity")).json();
    for (const entry of body.entries) {
      expect(Object.keys(entry)).not.toContain("byName");
      expect(Object.keys(entry)).not.toContain("changedById");
      expect(Object.keys(entry)).not.toContain("changedBy");
    }
  });

  it("pagina con cursor cuando hay más entradas que el tamaño pedido", async () => {
    const body = await (
      await call("http://localhost/api/portal/works/work-1/activity?take=2")
    ).json();
    expect(body.entries).toHaveLength(2);
    expect(body.nextCursor).toBe("chg-2");
  });

  it("rechaza un tamaño de página fuera de rango", async () => {
    const res = await call("http://localhost/api/portal/works/work-1/activity?take=500");
    expect(res.status).toBe(400);
  });

  it("sin otorgamiento responde 404", async () => {
    authState.clientWorkIds = [];
    const res = await call("http://localhost/api/portal/works/work-1/activity");
    expect(res.status).toBe(404);
  });

  it("un rol interno recibe 403", async () => {
    authState.role = "MEMBER";
    const res = await call("http://localhost/api/portal/works/work-1/activity");
    expect(res.status).toBe(403);
  });
});
