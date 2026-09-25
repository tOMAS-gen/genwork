import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * objetivos (D11): GET /api/portal/works/[id] agrupa las tareas del proyecto
 * en generales (`tasks`) + `objectives[]`, cada uno con su progreso.
 *
 * El mock de `work.findFirst` solo devuelve `objectives` si la consulta los
 * pidió (`select.objectives`), y solo deja pasar `objectiveId` de la raíz si
 * el `select` de tareas lo pidió: contra la implementación vieja (sin
 * objetivos) el test falla de verdad. Sigue el patrón de portal-works.test.ts.
 */

const authState = vi.hoisted(() => ({
  userId: "client-1",
  role: "CLIENT" as "CLIENT" | "MEMBER" | "SUPERADMIN",
  clientWorkIds: ["work-1"] as string[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: authState.userId, email: "cliente@test.local", name: "Cliente", globalRole: authState.role },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: authState.userId,
    globalRole: authState.role,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set(authState.clientWorkIds),
  })),
}));

type StatusType = "IN_PROGRESS" | "FINAL";

interface FakeTask {
  id: string;
  parentId: string | null;
  objectiveId: string | null;
  position: number;
  status: StatusType;
}

interface FakeObjective {
  id: string;
  title: string;
  description: string | null;
  position: number;
  workId: string;
  sourceTemplateId: string | null;
  createdById: string;
  createdAt: Date;
}

const db = vi.hoisted(() => ({
  tasks: [] as FakeTask[],
  objectives: [] as FakeObjective[],
  lastSelect: null as null | Record<string, unknown>,
}));

function toRow(t: FakeTask, withObjectiveId: boolean) {
  return {
    id: t.id,
    displayText: t.id,
    rawText: t.id,
    description: null,
    dueDate: null,
    position: t.position,
    parentId: t.parentId,
    parent: t.parentId ? { id: t.parentId, displayText: t.parentId } : null,
    status: { name: t.status, color: "#000", type: t.status },
    links: [],
    labels: [],
    _count: { subtasks: db.tasks.filter((c) => c.parentId === t.id).length },
    ...(withObjectiveId ? { objectiveId: t.objectiveId } : {}),
  };
}

type TaskSelect = { where?: { parentId?: null }; select?: { objectiveId?: boolean; subtasks?: unknown } };

vi.mock("@/lib/db/client", () => ({
  prisma: {
    clientWorkGrant: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; work?: unknown } }) => {
        if (!where.work) return [{ workId: "work-1" }];
        return [
          {
            work: {
              id: "work-1",
              name: "Casa Pérez",
              description: null,
              dueDate: null,
              stage: null,
              labels: [],
              // El listado ve TODAS las filas (raíces e hijas), planas.
              tasks: db.tasks.map((t) => toRow(t, false)),
            },
          },
        ];
      }),
    },
    work: {
      findFirst: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select: { tasks?: TaskSelect; objectives?: { orderBy?: unknown; select?: Record<string, boolean> } };
        }) => {
          db.lastSelect = select as Record<string, unknown>;
          if (where.id !== "work-1") return null;
          const tasksSelect = select.tasks;
          const roots = tasksSelect?.where?.parentId === null ? db.tasks.filter((t) => !t.parentId) : db.tasks;
          const wantsObjectiveId = !!tasksSelect?.select?.objectiveId;
          const wantsSubtasks = !!tasksSelect?.select?.subtasks;
          return {
            id: "work-1",
            name: "Casa Pérez",
            description: null,
            dueDate: null,
            stage: null,
            labels: [],
            doc: null,
            tasks: [...roots]
              .sort((a, b) => a.position - b.position)
              .map((t) => ({
                ...toRow(t, wantsObjectiveId),
                ...(wantsSubtasks
                  ? { subtasks: db.tasks.filter((c) => c.parentId === t.id).map((c) => toRow(c, false)) }
                  : {}),
              })),
            ...(select.objectives
              ? { objectives: [...db.objectives].sort((a, b) => a.position - b.position) }
              : {}),
          };
        },
      ),
    },
  },
}));

async function callDetail() {
  const { GET } = await import("@/app/api/portal/works/[id]/route");
  const res = await GET(new Request("http://localhost/api/portal/works/work-1"), {
    params: Promise.resolve({ id: "work-1" }),
  });
  expect(res.status).toBe(200);
  return res.json();
}

async function callList() {
  const { GET } = await import("@/app/api/portal/works/route");
  const res = await GET(new Request("http://localhost/api/portal/works"), undefined as never);
  return res.json();
}

function objective(id: string, title: string, position: number, description: string | null = null): FakeObjective {
  return {
    id,
    title,
    description,
    position,
    workId: "work-1",
    sourceTemplateId: "tpl-1",
    createdById: "user-9",
    createdAt: new Date("2026-09-01"),
  };
}

const task = (
  id: string,
  position: number,
  objectiveId: string | null,
  status: StatusType = "IN_PROGRESS",
  parentId: string | null = null,
): FakeTask => ({ id, position, objectiveId, status, parentId });

beforeEach(() => {
  // B (posición 1) va primero en el array para probar el orden.
  db.objectives = [objective("obj-b", "Obra", 1), objective("obj-a", "Diseño", 0, "Planos y renders")];
  db.tasks = [
    task("general-1", 0, null),
    task("general-2", 1, null, "FINAL"),
    task("a-1", 0, "obj-a", "FINAL"),
    task("a-2", 1, "obj-a"),
    // Objetivo B: un contenedor con 2 hijas (una hecha). El contenedor no suma.
    task("b-padre", 0, "obj-b"),
    task("b-hija-1", 0, "obj-b", "FINAL", "b-padre"),
    task("b-hija-2", 1, "obj-b", "IN_PROGRESS", "b-padre"),
  ];
});

describe("GET /api/portal/works/[id] — objetivos (D11)", () => {
  it("`tasks` trae SOLO las generales", async () => {
    const body = await callDetail();
    expect(body.tasks.map((t: { id: string }) => t.id)).toEqual(["general-1", "general-2"]);
  });

  it("los objetivos llegan en orden de posición, con su descripción y sus tareas", async () => {
    const body = await callDetail();
    expect(body.objectives.map((o: { title: string }) => o.title)).toEqual(["Diseño", "Obra"]);
    expect(body.objectives[0].description).toBe("Planos y renders");
    expect(body.objectives[0].tasks.map((t: { id: string }) => t.id)).toEqual(["a-1", "a-2"]);
    // La hija viaja anidada bajo su padre, no suelta.
    expect(body.objectives[1].tasks.map((t: { id: string }) => t.id)).toEqual(["b-padre"]);
    expect(body.objectives[1].tasks[0].subtasks.map((t: { id: string }) => t.id)).toEqual([
      "b-hija-1",
      "b-hija-2",
    ]);
  });

  it("taskCounts y pct por objetivo (con la regla de contenedor)", async () => {
    const body = await callDetail();
    const [a, b] = body.objectives;
    expect(a.taskCounts).toEqual({ done: 1, total: 2 });
    expect(a.pct).toBe(50);
    expect(b.taskCounts).toEqual({ done: 1, total: 2 }); // las 2 hijas, no el padre
    expect(b.pct).toBe(50);
  });

  it("el total del proyecto es la suma de generales + objetivos", async () => {
    const body = await callDetail();
    // generales 1/2 + A 1/2 + B 1/2
    expect(body.taskCounts).toEqual({ done: 3, total: 6 });
    expect(body.pct).toBe(50);
  });

  it("el listado `/api/portal/works` no cambia y coincide con el detalle", async () => {
    const [list, detail] = await Promise.all([callList(), callDetail()]);
    expect(list[0].taskCounts).toEqual(detail.taskCounts);
  });

  it("allowlist: la consulta solo pide id/título/descripción del objetivo", async () => {
    await callDetail();
    const objectives = db.lastSelect?.objectives as { select: Record<string, boolean> };
    expect(objectives.select).toEqual({ id: true, title: true, description: true });
  });

  it("allowlist: el objetivo no expone datos internos y las tareas no exponen objectiveId", async () => {
    const body = await callDetail();
    for (const o of body.objectives) {
      expect(Object.keys(o).sort()).toEqual(["description", "id", "pct", "taskCounts", "tasks", "title"]);
      for (const t of o.tasks) expect(Object.keys(t)).not.toContain("objectiveId");
    }
    for (const t of body.tasks) expect(Object.keys(t)).not.toContain("objectiveId");
  });

  it("un objetivo sin tareas aparece con 0/0 y `tasks: []`", async () => {
    db.objectives = [...db.objectives, objective("obj-c", "Entrega", 2)];
    const body = await callDetail();
    const c = body.objectives.find((o: { id: string }) => o.id === "obj-c");
    expect(c).toMatchObject({ taskCounts: { done: 0, total: 0 }, pct: 0, tasks: [] });
  });

  it("una tarea con un objectiveId desconocido cae en generales", async () => {
    db.tasks = [...db.tasks, task("huerfana", 2, "obj-borrado")];
    const body = await callDetail();
    expect(body.tasks.map((t: { id: string }) => t.id)).toContain("huerfana");
  });

  it("sin objetivos: `objectives: []` y todas las raíces son generales", async () => {
    db.objectives = [];
    db.tasks = db.tasks.map((t) => ({ ...t, objectiveId: null }));
    const body = await callDetail();
    expect(body.objectives).toEqual([]);
    expect(body.tasks.map((t: { id: string }) => t.id).sort()).toEqual(
      ["a-1", "a-2", "b-padre", "general-1", "general-2"],
    );
    expect(body.taskCounts).toEqual({ done: 3, total: 6 });
  });
});
