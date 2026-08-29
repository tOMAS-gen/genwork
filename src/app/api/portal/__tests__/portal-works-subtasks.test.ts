import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (Tarea 11): el portal de cliente también trata al padre como
 * contenedor — en el listado (`taskCounts`) y en el detalle (nesting +
 * `taskCounts`). Sigue el patrón de mocks de portal-works.test.ts (mismo
 * directorio), pero con un dataset dedicado a subtareas.
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

function status(type: "IN_PROGRESS" | "FINAL") {
  return { name: type, color: "#000", type };
}

const padre = {
  id: "padre",
  parentId: null,
  parent: null,
  displayText: "Padre",
  rawText: "Padre",
  description: null,
  dueDate: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  _count: { subtasks: 1 },
};

const hija = {
  id: "hija",
  parentId: "padre",
  parent: { id: "padre", displayText: "Padre" },
  displayText: "Hija",
  rawText: "Hija",
  description: null,
  dueDate: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  _count: { subtasks: 0 },
};

const suelta = {
  id: "suelta",
  parentId: null,
  parent: null,
  displayText: "Suelta",
  rawText: "Suelta",
  description: null,
  dueDate: null,
  position: 1,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  _count: { subtasks: 0 },
};

const allTasks = [padre, hija, suelta];

function makeWork() {
  return {
    id: "work-1",
    name: "Proyecto Cliente",
    description: null,
    dueDate: null,
    status: "ACTIVE",
    isTemplate: false,
    stage: null,
    labels: [],
    doc: { content: null },
    tasks: allTasks,
  };
}

const db = vi.hoisted(() => ({ works: [] as Record<string, unknown>[], grants: [] as { userId: string; workId: string }[] }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    clientWorkGrant: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; work?: unknown } }) => {
        const rows = db.grants.filter((g) => g.userId === where.userId);
        if (!where.work) return rows.map((g) => ({ workId: g.workId }));
        return rows
          .map((g) => db.works.find((w) => w.id === g.workId))
          .filter((w): w is Record<string, unknown> => !!w)
          .map((work) => ({ work }));
      }),
    },
    work: {
      // Inspecciona el `select.tasks` real: solo filtra `parentId: null` y
      // anida `subtasks` si el código efectivamente los pidió — así el test
      // cae en RED contra la implementación vieja (flat, sin container rule).
      findFirst: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: { tasks?: { where?: { parentId?: null }; select?: { subtasks?: unknown } } };
        }) => {
          const work = db.works.find((w) => w.id === where.id);
          if (!work) return null;
          const tasksSelect = select?.tasks;
          const rootFilterApplied = tasksSelect?.where?.parentId === null;
          const wantsSubtasks = !!tasksSelect?.select?.subtasks;
          const rows = rootFilterApplied ? allTasks.filter((t) => t.parentId === null) : allTasks;
          return {
            ...work,
            tasks: rows.map((t) => ({
              ...t,
              ...(wantsSubtasks ? { subtasks: allTasks.filter((s) => s.parentId === t.id) } : {}),
            })),
          };
        },
      ),
    },
  },
}));

async function callList() {
  const { GET } = await import("@/app/api/portal/works/route");
  return GET(new Request("http://localhost/api/portal/works"), undefined as never);
}

async function callDetail(id: string) {
  const { GET } = await import("@/app/api/portal/works/[id]/route");
  return GET(new Request(`http://localhost/api/portal/works/${id}`), { params: Promise.resolve({ id }) });
}

describe("Portal — un padre con subtareas no duplica el avance (062-subtareas, Tarea 11)", () => {
  beforeEach(() => {
    authState.userId = "client-1";
    authState.role = "CLIENT";
    authState.clientWorkIds = ["work-1"];
    db.works = [makeWork()];
    db.grants = [{ userId: "client-1", workId: "work-1" }];
  });

  it("listado: taskCounts no cuenta al contenedor (1 padre + 1 hija + 1 suelta abiertas = 2, no 3)", async () => {
    const res = await callList();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].taskCounts).toEqual({ done: 0, total: 2 });
  });

  it("detalle: las hijas viajan anidadas y taskCounts.total es 2, no 3", async () => {
    const res = await callDetail("work-1");
    expect(res.status).toBe(200);
    const body = await res.json();

    const ids = body.tasks.map((t: { id: string }) => t.id);
    expect(ids).toEqual(["padre", "suelta"]);
    expect(ids).not.toContain("hija");

    const padreDto = body.tasks.find((t: { id: string }) => t.id === "padre");
    expect(padreDto.subtasks).toHaveLength(1);
    expect(padreDto.subtasks[0].parentText).toBe("Padre");
    expect(padreDto.subtaskCount).toBe(1);

    expect(body.taskCounts).toEqual({ done: 0, total: 2 });
  });
});
