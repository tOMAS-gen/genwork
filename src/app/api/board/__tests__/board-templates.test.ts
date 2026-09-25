import { describe, it, expect, beforeEach, vi } from "vitest";
import { TASK_IN_ACTIVE_PROJECT_OR_LOOSE } from "@/server/workFilters";

/**
 * objetivos (higiene de plantillas, D15): GET /api/board (tablero global y TV)
 * deja de mostrar tareas de plantillas. Antes el filtro solo miraba el estado
 * del proyecto, así que una tarea de plantilla con `#sector` aparecía como
 * pendiente real en la columna de ese sector.
 *
 * El mock de `taskLink.findMany` EVALÚA `where.task` (igualdad, `OR` y la
 * relación `work`) contra el dataset: con el filtro viejo la tarea de plantilla
 * vuelve a aparecer y el test falla.
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

type Where = Record<string, unknown>;

function matchesWhere(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (value as Where[]).every((w) => matchesWhere(row, w));
    if (key === "work") {
      const work = row.work as Record<string, unknown> | null;
      return work !== null && matchesWhere(work, value as Where);
    }
    return row[key] === value;
  });
}

interface FakeLinkTask {
  id: string;
  displayText: string;
  workId: string | null;
  parentId: null;
  parent: null;
  work: { name: string; status: "ACTIVE" | "ARCHIVED"; isTemplate: boolean } | null;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" };
  _count: { subtasks: number };
}

const db = vi.hoisted(() => ({
  links: [] as { sectorId: string; type: "EXEC"; task: FakeLinkTask }[],
}));

const taskLinkFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findMany: vi.fn(async () => [
        { id: "sector-1", name: "Ventas", color: "#000", groupId: null, ownerId: null, group: null },
      ]),
    },
    taskLink: { findMany: taskLinkFindMany },
    workLabel: { findMany: vi.fn(async () => []) },
    task: { findMany: vi.fn(async () => []) },
  },
}));

import { GET } from "@/app/api/board/route";

function linkTask(
  id: string,
  work: FakeLinkTask["work"],
): { sectorId: string; type: "EXEC"; task: FakeLinkTask } {
  return {
    sectorId: "sector-1",
    type: "EXEC",
    task: {
      id,
      displayText: id,
      workId: work ? `work-of-${id}` : null,
      parentId: null,
      parent: null,
      work,
      status: { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
      _count: { subtasks: 0 },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.links = [
    linkTask("de-proyecto", { name: "Proyecto", status: "ACTIVE", isTemplate: false }),
    linkTask("de-plantilla", { name: "Plantilla", status: "ACTIVE", isTemplate: true }),
    linkTask("de-archivado", { name: "Viejo", status: "ARCHIVED", isTemplate: false }),
    linkTask("suelta", null),
  ];
  taskLinkFindMany.mockImplementation(
    async ({ where }: { where: { sectorId: string; type: string; task?: Where } }) =>
      db.links
        .filter((l) => l.sectorId === where.sectorId && l.type === where.type)
        .filter((l) => !where.task || matchesWhere(l.task as unknown as Record<string, unknown>, where.task))
        .map((l) => ({ task: l.task })),
  );
});

describe("GET /api/board — sin tareas de plantillas (objetivos, D15)", () => {
  it("la columna del sector muestra la tarea del proyecto activo y la suelta, no la de plantilla ni la archivada", async () => {
    const res = await GET(new Request("http://localhost/api/board"), undefined as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tasks: { id: string }[] }[];
    expect(body[0].tasks.map((t) => t.id).sort()).toEqual(["de-proyecto", "suelta"]);
  });

  it("los EXEC se piden con el filtro compartido (mismo que la vista del sector)", async () => {
    await GET(new Request("http://localhost/api/board"), undefined as never);
    expect(taskLinkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sectorId: "sector-1", type: "EXEC", task: TASK_IN_ACTIVE_PROJECT_OR_LOOSE },
      }),
    );
  });
});
