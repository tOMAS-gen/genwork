import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (Tarea 11): GET /api/sectors/[id]/tasks devuelve las hijas
 * anidadas bajo su padre (no sueltas en `loose`) y `metrics.total/done` trata
 * al padre como contenedor: sus hijas cuentan, el contenedor no.
 *
 * El mock de `prisma.task.findMany` INSPECCIONA `where.parentId` e
 * `include.subtasks` para no simular la anidación por su cuenta — así el test
 * cae en RED contra la implementación vieja.
 */

const SECTOR_ID = "sector-1";

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

vi.mock("@/server/tasks", () => ({
  loadApplicableStatusSet: vi.fn(async () => []),
  execSectorIdsOf: (links: { type: string; sectorId: string | null }[]) =>
    links.filter((l) => l.type === "EXEC" && l.sectorId).map((l) => l.sectorId as string),
  statusOptionDto: (s: { id: string }) => s,
}));

function status(type: "IN_PROGRESS" | "FINAL") {
  return { id: `status-${type}`, name: type, color: "#000", type };
}

const padre = {
  id: "padre",
  parentId: null,
  workId: null,
  sectorId: SECTOR_ID,
  position: 0,
  displayText: "Padre",
  rawText: "Padre",
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  work: null,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
  parent: null,
};

const hija = {
  id: "hija",
  parentId: "padre",
  workId: null,
  sectorId: SECTOR_ID,
  position: 0,
  displayText: "Hija",
  rawText: "Hija",
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  work: null,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
  parent: { id: "padre", displayText: "Padre" },
};

const suelta = {
  id: "suelta",
  parentId: null,
  workId: null,
  sectorId: SECTOR_ID,
  position: 1,
  displayText: "Suelta",
  rawText: "Suelta",
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  work: null,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
  parent: null,
};

const db = vi.hoisted(() => ({
  tasks: [] as { id: string; parentId: string | null; sectorId: string }[],
}));

type TaskWhere = { sectorId?: string; parentId?: null };
type TaskInclude = { subtasks?: unknown };

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findUnique: vi.fn(async () => ({
        id: SECTOR_ID,
        name: "Ventas",
        color: null,
        groupId: null,
        ownerId: null,
        group: null,
      })),
    },
    taskLink: {
      findMany: vi.fn(async () => []), // sin EXEC/REF: el escenario es 100% loose
    },
    task: {
      findMany: vi.fn(async ({ where, include }: { where: TaskWhere; include?: TaskInclude }) => {
        const rootFilterApplied = where.parentId === null;
        const wantsSubtasks = !!include?.subtasks;
        const all = db.tasks as (typeof padre)[];
        const rows = rootFilterApplied ? all.filter((t) => t.parentId === null) : all;
        return rows.map((t) => ({
          ...t,
          ...(wantsSubtasks ? { subtasks: all.filter((s) => s.parentId === t.id) } : {}),
        }));
      }),
    },
  },
}));

import { GET } from "@/app/api/sectors/[id]/tasks/route";

function req(url = `http://localhost/api/sectors/${SECTOR_ID}/tasks`) {
  return new Request(url, { method: "GET" });
}

describe("GET /api/sectors/[id]/tasks — subtareas anidadas (062-subtareas, Tarea 11)", () => {
  beforeEach(() => {
    db.tasks = [padre, hija, suelta];
  });

  it("las hijas viajan anidadas bajo su padre en `loose`, no sueltas", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    const ids = body.loose.map((t: { id: string }) => t.id);
    expect(ids).toEqual(["padre", "suelta"]);
    expect(ids).not.toContain("hija");

    const padreDto = body.loose.find((t: { id: string }) => t.id === "padre");
    expect(padreDto.subtasks).toHaveLength(1);
    expect(padreDto.subtasks[0].id).toBe("hija");
    expect(padreDto.subtasks[0].parentText).toBe("Padre");
    expect(padreDto.subtaskCount).toBe(1);
    expect(padreDto.subtaskDone).toBe(0);
  });

  it("metrics: un padre con subtareas no suma como contenedor (1 padre + 1 hija + 1 suelta abiertas = 2 pendientes)", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    const body = await res.json();
    expect(body.metrics.total).toBe(2); // hija + suelta (el padre-contenedor no suma)
    expect(body.metrics.done).toBe(0);
  });
});
