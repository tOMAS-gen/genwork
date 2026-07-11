import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T018 (US3): confirma a nivel de API (no solo del motor de permisos puro) que:
 * - GET /api/sectors/:id/tasks responde 404 a un MEMBER sin SectorGrant sobre ese
 *   sector (SC-004: el sector no existe *para vos* si no tenés acceso).
 * - SUPERADMIN puede PATCH y DELETE cualquier sector sin tener SectorGrant explícito
 *   (T008 usa requireSuperAdmin(), que no depende del motor de permisos por grant).
 *
 * Se mockea @/lib/db/client (dataset en memoria) y @/server/auth (sesión mutable
 * por test), siguiendo el patrón de src/server/__tests__/tasks.test.ts.
 */

interface FakeSector {
  id: string;
  name: string;
  color: string | null;
}

const sectors: FakeSector[] = [{ id: "sector-1", name: "Ventas", color: null }];

let currentSession: { user: { id: string; globalRole: string } } | null = null;

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => {
    if (!currentSession) throw Object.assign(new Error("No autenticado"), { status: 401 });
    return currentSession;
  }),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        sectors.find((s) => s.id === id) ?? null,
      ),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeSector> }) => {
        const s = sectors.find((x) => x.id === id)!;
        Object.assign(s, data);
        return s;
      }),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const idx = sectors.findIndex((x) => x.id === id);
        if (idx >= 0) sectors.splice(idx, 1);
      }),
    },
    taskLink: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    task: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    groupMembership: {
      findMany: vi.fn(async () => []),
    },
    sectorGrant: {
      findMany: vi.fn(async () => []),
    },
    readerGrant: {
      findMany: vi.fn(async () => []),
    },
    user: {
      findUniqueOrThrow: vi.fn(async ({ where: { id } }: { where: { id: string } }) => ({
        id,
        globalRole: currentSession?.user.globalRole ?? "MEMBER",
      })),
    },
  },
}));

import { GET } from "@/app/api/sectors/[id]/tasks/route";
import { PATCH, DELETE } from "@/app/api/sectors/[id]/route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  sectors.length = 0;
  sectors.push({ id: "sector-1", name: "Ventas", color: null });
  currentSession = null;
});

describe("GET /api/sectors/:id/tasks — SC-004", () => {
  it("MEMBER sin SectorGrant sobre el sector recibe 404 (el sector 'no existe' para él)", async () => {
    currentSession = { user: { id: "u-member", globalRole: "MEMBER" } };

    const req = new Request("http://localhost/api/sectors/sector-1/tasks");
    const res = await GET(req, ctx("sector-1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH/DELETE /api/sectors/:id — SUPERADMIN opera sin SectorGrant explícito", () => {
  it("SUPERADMIN puede PATCH cualquier sector aunque no tenga SectorGrant", async () => {
    currentSession = { user: { id: "u-admin", globalRole: "SUPERADMIN" } };

    const req = new Request("http://localhost/api/sectors/sector-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ color: "#112233" }),
    });
    const res = await PATCH(req, ctx("sector-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.color).toBe("#112233");
  });

  it("SUPERADMIN puede DELETE cualquier sector aunque no tenga SectorGrant (con confirm=true)", async () => {
    currentSession = { user: { id: "u-admin", globalRole: "SUPERADMIN" } };

    const req = new Request("http://localhost/api/sectors/sector-1?confirm=true", {
      method: "DELETE",
    });
    const res = await DELETE(req, ctx("sector-1"));

    expect(res.status).toBe(204);
  });
});
