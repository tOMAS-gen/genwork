import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (hallazgo Importante A de revisión sobre Tarea 11): la
 * respuesta de PATCH /api/works/[id]/tasks/reorder tiene que devolver el
 * MISMO contrato que works/[id]/route.ts (raíces con `parentId: null`, hijas
 * anidadas en `subtasks`, `parentText`/`subtaskCount`/`subtaskDone`) — la
 * página le pisa el estado de `work.tasks` con esta respuesta tal cual
 * (src/app/(main)/works/[id]/page.tsx, commitReorder). Antes de este arreglo
 * el 409 TASK_SET_CHANGED del crítico volvía esta rama inalcanzable con
 * subtareas; al arreglar el crítico, esta rama quedó alcanzable con el
 * contrato viejo (plano, sin anidar) todavía puesto.
 *
 * `reorderTasks` se mockea (ya cubierto por tests/unit/task-reorder.test.ts,
 * incluido el escenario exacto del hallazgo Crítico); este test aísla la
 * construcción de la RESPUESTA del endpoint.
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

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

// Simula el efecto real de reorderTasks (ya probado en tests/unit/task-reorder.test.ts):
// reasigna `position = índice` a las raíces recibidas, para que el mock de
// `task.findMany` (que sí ordena por `position`) devuelva el orden nuevo.
const reorderTasksMock = vi.fn(async (_workId: string, orderedTaskIds: string[]) => {
  orderedTaskIds.forEach((id, index) => {
    const t = db.tasks.find((x) => x.id === id);
    if (t) t.position = index;
  });
});
vi.mock("@/server/tasks", () => ({
  reorderTasks: (workId: string, orderedTaskIds: string[]) => reorderTasksMock(workId, orderedTaskIds),
  loadApplicableStatusSet: vi.fn(async () => []),
  execSectorIdsOf: (links: { type: string; sectorId: string | null }[]) =>
    links.filter((l) => l.type === "EXEC" && l.sectorId).map((l) => l.sectorId as string),
  statusOptionDto: (s: { id: string }) => s,
}));

const WORK_ID = "11111111-1111-4111-8111-111111111111";
const PADRE_ID = "22222222-2222-4222-8222-222222222222";
const HIJA_ID = "33333333-3333-4333-8333-333333333333";
const SUELTA_ID = "44444444-4444-4444-8444-444444444444";

function status(type: "IN_PROGRESS" | "FINAL") {
  return { id: `status-${type}`, name: type, color: "#000", type };
}

const padre = {
  id: PADRE_ID,
  parentId: null,
  parent: null,
  rawText: "Padre",
  displayText: "Padre",
  workId: WORK_ID,
  sectorId: null,
  position: 1,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
};

const hija = {
  id: HIJA_ID,
  parentId: PADRE_ID,
  parent: { id: PADRE_ID, displayText: "Padre" },
  rawText: "Hija",
  displayText: "Hija",
  workId: WORK_ID,
  sectorId: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
};

const suelta = {
  id: SUELTA_ID,
  parentId: null,
  parent: null,
  rawText: "Suelta",
  displayText: "Suelta",
  workId: WORK_ID,
  sectorId: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
};

const db = vi.hoisted(() => ({
  tasks: [] as { id: string; parentId: string | null; workId: string; position: number }[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === WORK_ID
          ? { id: WORK_ID, groupId: null, ownerId: "user-1", group: { publicRead: false } }
          : null,
      ),
    },
    task: {
      // Inspecciona `where.parentId` de verdad (en vez de ignorarlo) para que
      // el RED de este arreglo sea honesto contra la respuesta plana vieja.
      findMany: vi.fn(async ({ where }: { where: { workId: string; parentId?: null } }) => {
        const rows = db.tasks.filter((t) => t.workId === where.workId);
        return ("parentId" in where ? rows.filter((t) => t.parentId === null) : rows)
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((t) => ({
            ...t,
            subtasks: rows.filter((s) => s.parentId === t.id),
          }));
      }),
    },
  },
}));

import { PATCH } from "@/app/api/works/[id]/tasks/reorder/route";

function req(orderedTaskIds: string[]) {
  return new Request(`http://localhost/api/works/${WORK_ID}/tasks/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedTaskIds }),
  });
}

describe("PATCH /api/works/[id]/tasks/reorder — contrato de la respuesta (062-subtareas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tasks = [padre, hija, suelta];
  });

  it("devuelve solo raíces, con las hijas anidadas en subtasks (no sueltas)", async () => {
    const res = await PATCH(req([SUELTA_ID, PADRE_ID]), { params: Promise.resolve({ id: WORK_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    const ids = body.map((t: { id: string }) => t.id);
    expect(ids).toEqual([SUELTA_ID, PADRE_ID]);
    expect(ids).not.toContain(HIJA_ID);

    const padreDto = body.find((t: { id: string }) => t.id === PADRE_ID);
    expect(padreDto.subtasks).toHaveLength(1);
    expect(padreDto.subtasks[0].id).toBe(HIJA_ID);
    expect(padreDto.subtaskCount).toBe(1);
    expect(padreDto.subtaskDone).toBe(0);
    expect(padreDto.parentText).toBeNull();
  });

  it("la hija anidada trae parentText y el mismo shape que cualquier tarea (statusOptions/labels)", async () => {
    const res = await PATCH(req([SUELTA_ID, PADRE_ID]), { params: Promise.resolve({ id: WORK_ID }) });
    const body = await res.json();
    const hijaDto = body.find((t: { id: string }) => t.id === PADRE_ID).subtasks[0];

    expect(hijaDto.parentId).toBe(PADRE_ID);
    expect(hijaDto.parentText).toBe("Padre");
    expect(hijaDto).toHaveProperty("statusOptions");
    expect(hijaDto).toHaveProperty("labels");
    expect(hijaDto.subtasks).toEqual([]);
  });
});
