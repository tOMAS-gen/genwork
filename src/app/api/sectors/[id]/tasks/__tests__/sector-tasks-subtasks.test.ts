import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (Tarea 11 + ruling 2026-08-29): GET /api/sectors/[id]/tasks.
 *
 * Dos reglas conviven:
 * 1. Si el padre de una hija TAMBIÉN está en esta vista, la hija se anida bajo
 *    él (no se repite suelta) y el padre-contenedor no suma a `metrics`.
 * 2. Si el padre NO está en esta vista (delegación a otro sector, o el padre
 *    vive en un proyecto sin vínculo propio a este sector), la hija se lista
 *    PLANA con su `parentText` — nunca desaparece (ruling: "un pendiente que
 *    nadie puede encontrar ni completar" viola el Principio I).
 *
 * `_count.subtasks` (global, vía Prisma) decide si una tarea es contenedora
 * para `metrics` — independiente de cuántas de sus hijas sean visibles en
 * ESTA página en particular (ver comentario en route.ts).
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

interface FakeTask {
  id: string;
  parentId: string | null;
  parent: { id: string; displayText: string } | null;
  workId: string | null;
  sectorId: string | null;
  position: number;
  rawText: string;
  displayText: string;
  status: ReturnType<typeof status>;
  links: unknown[];
  labels: unknown[];
  work: { id: string; name: string; status: string; groupId: string | null; group: null } | null;
  homeSector: { id: string; name: string; group: null } | null;
  _count: { subtasks: number };
}

function baseTask(over: Partial<FakeTask> & { id: string }): FakeTask {
  return {
    parentId: null,
    parent: null,
    workId: null,
    sectorId: null,
    position: 0,
    rawText: over.id,
    displayText: over.id,
    status: status("IN_PROGRESS"),
    links: [],
    labels: [],
    work: null,
    homeSector: null,
    _count: { subtasks: 0 },
    ...over,
  };
}

// Escenario 1: padre + hija (ambos home = sector-1, la hija hereda el sector
// del padre) + suelta. El padre es contenedor (_count.subtasks: 1).
const padre = baseTask({
  id: "padre",
  sectorId: SECTOR_ID,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
  _count: { subtasks: 1 },
});
const hija = baseTask({
  id: "hija",
  parentId: "padre",
  parent: { id: "padre", displayText: "Padre" },
  sectorId: SECTOR_ID,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
});
const suelta = baseTask({
  id: "suelta",
  sectorId: SECTOR_ID,
  homeSector: { id: SECTOR_ID, name: "Ventas", group: null },
});

// Escenario 2 (ruling): hija delegada a este sector por su PROPIO vínculo EXEC;
// su padre vive en un proyecto y no tiene ningún vínculo con sector-1 — no
// aparece en ninguna consulta de esta página.
const hijaDelegada = baseTask({
  id: "hija-delegada",
  parentId: "padre-otro",
  parent: { id: "padre-otro", displayText: "Padre en otro proyecto" },
  workId: "work-1",
  work: { id: "work-1", name: "Proyecto Externo", status: "ACTIVE", groupId: null, group: null },
});

const db = vi.hoisted(() => ({
  looseTasks: [] as ReturnType<typeof baseTask>[],
  execLinkTasks: [] as ReturnType<typeof baseTask>[],
}));

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
    // Los dos mocks INSPECCIONAN `where.task.parentId`/`where.parentId` reales
    // (en vez de ignorarlos) para que el RED de la Regla 2 sea honesto contra
    // la implementación vieja (que sí filtraba `parentId: null`).
    taskLink: {
      findMany: vi.fn(
        async ({ where }: { where: { type: "EXEC" | "REF"; task?: { parentId?: null } } }) => {
          if (where.type !== "EXEC") return [];
          const rows = "parentId" in (where.task ?? {})
            ? db.execLinkTasks.filter((t) => t.parentId === null)
            : db.execLinkTasks;
          return rows.map((t) => ({ task: t }));
        },
      ),
    },
    task: {
      findMany: vi.fn(async ({ where }: { where: { parentId?: null } }) => {
        return "parentId" in where ? db.looseTasks.filter((t) => t.parentId === null) : db.looseTasks;
      }),
    },
  },
}));

import { GET } from "@/app/api/sectors/[id]/tasks/route";

function req(url = `http://localhost/api/sectors/${SECTOR_ID}/tasks`) {
  return new Request(url, { method: "GET" });
}

describe("GET /api/sectors/[id]/tasks — anidación y contador de contenedores (062-subtareas)", () => {
  beforeEach(() => {
    db.looseTasks = [padre, hija, suelta];
    db.execLinkTasks = [];
  });

  it("Regla 1: las hijas viajan anidadas bajo su padre en `loose` cuando el padre TAMBIÉN está en la vista", async () => {
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

  it("Regla 1 → metrics: el padre-contenedor no suma, solo su hija visible (1 padre + 1 hija + 1 suelta abiertas = 2 pendientes)", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    const body = await res.json();
    expect(body.metrics.total).toBe(2);
    expect(body.metrics.done).toBe(0);
  });

  it("Regla 2 (ruling): una hija delegada por vínculo propio, sin su padre en la vista, se lista PLANA con parentText", async () => {
    db.looseTasks = [];
    db.execLinkTasks = [hijaDelegada];

    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    // No aparece suelta en `loose` (no tiene home sector acá): va agrupada por
    // proyecto, ya que hereda `workId` de su padre.
    expect(body.byWork).toHaveLength(1);
    const listed = body.byWork[0].tasks;
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("hija-delegada");
    expect(listed[0].parentId).toBe("padre-otro");
    expect(listed[0].parentText).toBe("Padre en otro proyecto");
    expect(listed[0].subtasks).toEqual([]); // no tiene hijas propias visibles acá
  });

  it("Regla 2 → metrics: la hija delegada cuenta como pendiente normal (no es contenedora)", async () => {
    db.looseTasks = [];
    db.execLinkTasks = [hijaDelegada];

    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    const body = await res.json();
    expect(body.metrics.total).toBe(1);
    expect(body.metrics.done).toBe(0);
  });

  it("Un padre-contenedor visible acá SIN ninguna de sus hijas en esta vista no suma nada (evita duplicar con el sector donde sí se ven)", async () => {
    // El padre tiene vínculo EXEC propio a este sector (aparece acá), pero
    // ninguna de sus hijas está vinculada a sector-1: `_count.subtasks` (global)
    // sigue en 1, así que el padre no debe contar como pendiente él mismo.
    const padreSinHijasAca = baseTask({
      id: "padre-solo",
      _count: { subtasks: 1 },
    });
    db.looseTasks = [];
    db.execLinkTasks = [padreSinHijasAca];

    const res = await GET(req(), { params: Promise.resolve({ id: SECTOR_ID }) });
    const body = await res.json();
    expect(body.metrics.total).toBe(0);
    expect(body.metrics.done).toBe(0);
  });
});
