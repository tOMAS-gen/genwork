import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 — contrato del portal de cliente.
 *
 * Cubre el gate por rol y por otorgamiento (FR-005, FR-022) y la forma de la
 * respuesta (FR-021): el test de ausencia de claves es el que sobrevive a los
 * refactors futuros, porque un `select` que crezca de más lo rompe.
 *
 * Sigue el patrón de src/app/api/sectors/__tests__/sectors.test.ts: prisma en
 * memoria, sin base real.
 */

const authState = vi.hoisted(() => ({
  userId: "client-1",
  role: "CLIENT" as "CLIENT" | "MEMBER" | "SUPERADMIN",
  clientWorkIds: ["work-1"] as string[],
  hasSession: true,
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => {
    if (!authState.hasSession) throw Object.assign(new Error("No autenticado"), { status: 401 });
    return {
      user: {
        id: authState.userId,
        email: "cliente@test.local",
        name: "Cliente de prueba",
        globalRole: authState.role,
      },
    };
  }),
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

const db = vi.hoisted(() => ({
  works: [] as Record<string, unknown>[],
  grants: [] as { userId: string; workId: string }[],
}));

function workMatchesPortalFilter(w: Record<string, unknown>): boolean {
  return w.status === "ACTIVE" && w.isTemplate === false;
}

vi.mock("@/lib/db/client", () => ({
  prisma: {
    clientWorkGrant: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; work?: unknown } }) => {
        const rows = db.grants.filter((g) => g.userId === where.userId);
        if (!where.work) return rows.map((g) => ({ workId: g.workId }));
        return rows
          .map((g) => db.works.find((w) => w.id === g.workId))
          .filter((w): w is Record<string, unknown> => !!w && workMatchesPortalFilter(w))
          .map((work) => ({ work }));
      }),
    },
    work: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const work = db.works.find((w) => w.id === where.id);
        return work && workMatchesPortalFilter(work) ? work : null;
      }),
    },
  },
}));

function makeWork(over: Record<string, unknown> = {}) {
  return {
    id: "work-1",
    name: "Proyecto Cliente",
    description: "Descripción visible",
    dueDate: null,
    status: "ACTIVE",
    isTemplate: false,
    stage: { name: "Producción", color: "#3b5bfa" },
    labels: [{ isPrimary: true, value: { name: "Alta", color: "#dc2626" } }],
    doc: { content: { type: "doc" } },
    tasks: [
      {
        id: "task-1",
        displayText: "Diseñar tapa",
        rawText: "Diseñar tapa #Diseño",
        description: null,
        dueDate: null,
        position: 0,
        status: { name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
        links: [{ type: "EXEC", targetType: "SECTOR", sector: { name: "Diseño", color: "#111" }, user: null }],
        labels: [],
      },
      {
        id: "task-2",
        displayText: "Aprobar arte",
        rawText: "Aprobar arte",
        description: null,
        dueDate: null,
        position: 1,
        status: { name: "Hecha", color: "#22c55e", type: "FINAL" },
        links: [],
        labels: [],
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  authState.userId = "client-1";
  authState.role = "CLIENT";
  authState.clientWorkIds = ["work-1"];
  authState.hasSession = true;
  db.works = [makeWork()];
  db.grants = [{ userId: "client-1", workId: "work-1" }];
  vi.clearAllMocks();
});

async function callList() {
  const { GET } = await import("@/app/api/portal/works/route");
  return GET(new Request("http://localhost/api/portal/works"), undefined as never);
}

async function callDetail(id: string) {
  const { GET } = await import("@/app/api/portal/works/[id]/route");
  return GET(new Request(`http://localhost/api/portal/works/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/portal/works — listado (FR-015)", () => {
  it("devuelve los proyectos otorgados con su avance", async () => {
    const res = await callList();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Proyecto Cliente");
    expect(body[0].taskCounts).toEqual({ done: 1, total: 2 });
    expect(body[0].pct).toBe(50);
  });

  it("no devuelve proyectos archivados", async () => {
    db.works = [makeWork({ status: "ARCHIVED" })];
    const body = await (await callList()).json();
    expect(body).toEqual([]);
  });

  it("no devuelve plantillas", async () => {
    db.works = [makeWork({ isTemplate: true })];
    const body = await (await callList()).json();
    expect(body).toEqual([]);
  });

  it("un rol interno recibe 403", async () => {
    authState.role = "MEMBER";
    const res = await callList();
    expect(res.status).toBe(403);
  });

  it("sin sesión recibe 401", async () => {
    authState.hasSession = false;
    const res = await callList();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/portal/works/[id] — detalle (FR-016, FR-022)", () => {
  it("devuelve las tareas con estado, vínculos y etiquetas", async () => {
    const res = await callDetail("work-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(2);
    expect(body.tasks[0].status.name).toBe("Pendiente");
    // FR-017: los sectores ejecutores se muestran, no se anonimizan.
    expect(body.tasks[0].links[0]).toMatchObject({ type: "EXEC", name: "Diseño" });
    expect(body.doc).toEqual({ content: { type: "doc" } });
  });

  it("un proyecto sin otorgamiento responde 404, no 403", async () => {
    authState.clientWorkIds = [];
    const res = await callDetail("work-1");
    // No filtra la existencia del recurso.
    expect(res.status).toBe(404);
  });

  it("un proyecto archivado responde 404 aunque siga otorgado", async () => {
    db.works = [makeWork({ status: "ARCHIVED" })];
    const res = await callDetail("work-1");
    expect(res.status).toBe(404);
  });

  it("un rol interno recibe 403", async () => {
    authState.role = "SUPERADMIN";
    const res = await callDetail("work-1");
    expect(res.status).toBe(403);
  });

  it("no expone ningún campo de organización interna (FR-021)", async () => {
    const body = await (await callDetail("work-1")).json();
    const prohibidos = [
      "nextcloudFolderPath",
      "folderSeq",
      "folderEnabledAt",
      "code",
      "attachments",
      "archive",
      "group",
      "groupId",
      "ownerId",
      "createdById",
      "access",
      "isTemplate",
    ];
    for (const key of prohibidos) {
      expect(Object.keys(body)).not.toContain(key);
    }
    for (const task of body.tasks) {
      expect(Object.keys(task)).not.toContain("statusOptions");
      expect(Object.keys(task)).not.toContain("creatorId");
      expect(Object.keys(task)).not.toContain("completedById");
    }
  });
});

describe("el namespace del portal es de solo lectura", () => {
  it("ningún módulo de /api/portal exporta métodos de escritura", async () => {
    const modules = await Promise.all([
      import("@/app/api/portal/works/route"),
      import("@/app/api/portal/works/[id]/route"),
      import("@/app/api/portal/works/[id]/activity/route"),
      import("@/app/api/portal/stream/route"),
    ]);
    for (const mod of modules) {
      const exported = Object.keys(mod);
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        expect(exported).not.toContain(method);
      }
      expect(exported).toContain("GET");
    }
  });
});
