import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * T015: cubre el gate de requireSuperAdmin() en /api/sectors (T007) y
 * /api/sectors/[id] (T008) — MEMBER debe recibir 403 en toda mutación,
 * SUPERADMIN debe poder crear (201).
 *
 * Se mockea @/server/auth (requireSession, usado por requireSuperAdmin en
 * @/server/guards) y @/lib/db/client (prisma) con un dataset en memoria,
 * siguiendo el patrón de src/server/__tests__/tasks.test.ts.
 */

const authState = vi.hoisted(() => ({
  role: "MEMBER" as "MEMBER" | "SUPERADMIN",
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: "user-1",
      email: "user@test.local",
      name: "Usuario de prueba",
      globalRole: authState.role,
    },
  })),
}));

vi.mock("@/server/events", () => ({
  emit: vi.fn(),
}));

interface FakeSector {
  id: string;
  name: string;
  color: string | null;
}

const db = vi.hoisted(() => ({
  sectors: [] as FakeSector[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => db.sectors.length),
      create: vi.fn(async ({ data }: { data: { name: string; color: string | null } }) => {
        const sector: FakeSector = { id: `sector-${db.sectors.length + 1}`, ...data };
        db.sectors.push(sector);
        return sector;
      }),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.sectors.find((s) => s.id === id) ?? null,
      ),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeSector> }) => {
        const sector = db.sectors.find((s) => s.id === id)!;
        Object.assign(sector, data);
        return sector;
      }),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        db.sectors = db.sectors.filter((s) => s.id !== id);
        return null;
      }),
    },
    taskLink: {
      count: vi.fn(async () => 0),
    },
    task: {
      count: vi.fn(async () => 0),
    },
  },
}));

import { POST } from "@/app/api/sectors/route";
import { PATCH, DELETE } from "@/app/api/sectors/[id]/route";

function jsonRequest(method: string, body: unknown, url = "http://localhost/api/sectors") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function plainRequest(method: string, url: string) {
  return new Request(url, { method });
}

describe("POST /api/sectors — gate requireSuperAdmin (T007)", () => {
  beforeEach(() => {
    authState.role = "MEMBER";
    db.sectors = [];
  });

  it("MEMBER → 403", async () => {
    const res = await POST(jsonRequest("POST", { name: "Ventas" }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("SUPERADMIN → 201", async () => {
    authState.role = "SUPERADMIN";
    const res = await POST(jsonRequest("POST", { name: "Ventas" }), undefined as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Ventas");
  });
});

describe("PATCH /DELETE /api/sectors/[id] — gate requireSuperAdmin (T008)", () => {
  beforeEach(() => {
    authState.role = "MEMBER";
    db.sectors = [{ id: "sector-1", name: "Ventas", color: "#000000" }];
  });

  it("PATCH con MEMBER → 403", async () => {
    const res = await PATCH(jsonRequest("PATCH", { name: "Otro nombre" }, "http://localhost/api/sectors/sector-1"), {
      params: Promise.resolve({ id: "sector-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE con MEMBER → 403", async () => {
    const res = await DELETE(plainRequest("DELETE", "http://localhost/api/sectors/sector-1"), {
      params: Promise.resolve({ id: "sector-1" }),
    });
    expect(res.status).toBe(403);
  });
});
