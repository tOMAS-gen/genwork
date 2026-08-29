import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (Tarea 11): GET /api/board lista cada subtarea como tarjeta
 * propia (excepción a la anidación de los demás listados) pero cada tarjeta
 * trae `parentId`/`parentText` para armar la migaja "tarea de: <padre>".
 */

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: "SUPERADMIN" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "SUPERADMIN",
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const db = vi.hoisted(() => ({
  sectors: [{ id: "sector-1", name: "Ventas", color: "#000", groupId: null, ownerId: null, group: null }],
  links: [] as unknown[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findMany: vi.fn(async () => db.sectors),
    },
    taskLink: {
      findMany: vi.fn(async () => db.links),
    },
    workLabel: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import { GET } from "@/app/api/board/route";

function req() {
  return new Request("http://localhost/api/board", { method: "GET" });
}

describe("GET /api/board — parentText en subtareas (062-subtareas, Tarea 11)", () => {
  beforeEach(() => {
    db.links = [
      {
        task: {
          id: "hija",
          displayText: "Hija",
          workId: null,
          parentId: "padre",
          parent: { id: "padre", displayText: "Padre" },
          work: null,
          status: { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
        },
      },
      {
        task: {
          id: "suelta",
          displayText: "Suelta",
          workId: null,
          parentId: null,
          parent: null,
          work: null,
          status: { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
        },
      },
    ];
  });

  it("una subtarea es su propia tarjeta y trae parentText con el texto del padre", async () => {
    const res = await GET(req(), undefined as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    const { tasks } = body[0];

    expect(tasks).toHaveLength(2); // ambas viajan sueltas, es la excepción del tablero

    const hija = tasks.find((t: { id: string }) => t.id === "hija");
    expect(hija.parentId).toBe("padre");
    expect(hija.parentText).toBe("Padre");

    const suelta = tasks.find((t: { id: string }) => t.id === "suelta");
    expect(suelta.parentId).toBeNull();
    expect(suelta.parentText).toBeNull();
  });
});
