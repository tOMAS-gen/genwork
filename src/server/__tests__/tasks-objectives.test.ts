import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * objetivos (fase 4): `saveTask` y las secciones de un proyecto.
 *
 * Cubre lo que no cubren `task-parent.test.ts` (setTaskParent),
 * `task-reorder.test.ts` (reorderTasks) ni `resolveTask-templates.test.ts`
 * (`/Plantilla` no es destino):
 * - alta dentro de un objetivo (`contextObjectiveId`): proyecto y posición
 *   del objetivo, 400 `OBJECTIVE_WORK_MISMATCH`, 404, 403 sin operar;
 * - `/Otro` escrito al crear dentro de un objetivo → general en Otro;
 * - una hija hereda el objetivo del padre (e ignora `contextObjectiveId`);
 * - editar con `/Otro` limpia el objetivo, va al final de las generales del
 *   destino, muda a las hijas y avisa al proyecto viejo;
 * - editar sin mudanza conserva objetivo y posición.
 *
 * `saveTask`, `resolveTask`, `nextPosition` y `requireWorkAccess` corren
 * reales contra un dataset en memoria (el mock evalúa los `where`).
 */

type Where = Record<string, unknown>;
type StatusType = "IN_PROGRESS" | "FINAL";

interface FakeTask {
  id: string;
  rawText: string;
  workId: string | null;
  sectorId: string | null;
  objectiveId: string | null;
  parentId: string | null;
  position: number;
  statusId: string;
  status: { id: string; type: StatusType };
  links: { type: "EXEC" | "REF"; sectorId: string | null }[];
}

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
}

const SET = [
  {
    id: "pendiente",
    name: "Pendiente",
    color: "#94a3b8",
    type: "IN_PROGRESS" as const,
    sortOrder: 0,
    groupId: null,
    ownerId: null,
    sectorId: null,
  },
  {
    id: "hecha",
    name: "Hecha",
    color: "#22c55e",
    type: "FINAL" as const,
    sortOrder: 1,
    groupId: null,
    ownerId: null,
    sectorId: null,
  },
];

const db = vi.hoisted(() => ({
  tasks: [] as FakeTask[],
  works: [] as FakeWork[],
  objectives: [] as { id: string; workId: string }[],
  nextId: 0,
}));

function matchesWhere(row: Record<string, unknown>, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (value as Where[]).every((w) => matchesWhere(row, w));
    const actual = row[key];
    if (value !== null && typeof value === "object") {
      const v = value as Record<string, unknown>;
      if ("in" in v) return (v.in as unknown[]).includes(actual);
      return matchesWhere((actual ?? {}) as Record<string, unknown>, v);
    }
    return actual === value;
  });
}

const statusRef = (id: string) => ({
  id,
  type: (id === "hecha" ? "FINAL" : "IN_PROGRESS") as StatusType,
});

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const t = db.tasks.find((x) => x.id === id);
        return t ? { ...t, links: t.links.filter((l) => l.type === "EXEC") } : null;
      }),
      findMany: vi.fn(async ({ where }: { where: Where }) =>
        db.tasks.filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where)),
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & { links?: { create?: FakeTask["links"] } };
        }) => {
          const statusId = data.statusId as string;
          const t: FakeTask = {
            id: `nueva-${++db.nextId}`,
            rawText: data.rawText as string,
            workId: (data.workId as string | null) ?? null,
            sectorId: (data.sectorId as string | null) ?? null,
            objectiveId: (data.objectiveId as string | null) ?? null,
            parentId: (data.parentId as string | null) ?? null,
            position: data.position as number,
            statusId,
            status: statusRef(statusId),
            links: data.links?.create ?? [],
          };
          db.tasks.push(t);
          return t;
        },
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const t = db.tasks.find((x) => x.id === id)!;
          for (const key of [
            "rawText",
            "workId",
            "sectorId",
            "objectiveId",
            "parentId",
            "position",
          ] as const) {
            if (key in data) (t as unknown as Record<string, unknown>)[key] = data[key];
          }
          if (typeof data.statusId === "string") {
            t.statusId = data.statusId;
            t.status = statusRef(data.statusId);
          }
          return t;
        },
      ),
      aggregate: vi.fn(async ({ where }: { where: Where }) => {
        const ps = db.tasks
          .filter((t) => matchesWhere(t as unknown as Record<string, unknown>, where))
          .map((t) => t.position);
        return { _max: { position: ps.length ? Math.max(...ps) : null } };
      }),
    },
    objective: {
      findUnique: vi.fn(
        async ({ where: { id } }: { where: { id: string } }) =>
          db.objectives.find((o) => o.id === id) ?? null,
      ),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const w = db.works.find((x) => x.id === id);
        return w
          ? {
              ...w,
              group: w.groupId ? { id: w.groupId, name: "G", publicRead: false } : null,
              stage: null,
            }
          : null;
      }),
      findMany: vi.fn(async ({ where }: { where: Where }) =>
        db.works.filter((w) => matchesWhere(w as unknown as Record<string, unknown>, where)),
      ),
    },
    sector: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    user: { findMany: vi.fn(async () => []) },
    labelValue: { findMany: vi.fn(async () => []) },
    taskStatus: {
      findMany: vi.fn(async () => SET),
      count: vi.fn(async () => SET.length),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    taskStatusChange: { create: vi.fn(async ({ data }: { data: unknown }) => data) },
  },
}));

const emit = vi.hoisted(() => vi.fn());
vi.mock("@/server/events", () => ({ emit }));

const { saveTask } = await import("@/server/tasks");

const GROUP = "group-1";
const WORK = "work-obra";
const OTRO = "work-otro";
const OBJ = "obj-1";
const OBJ_OTRO = "obj-otro";

function ctxFor(role: UserContext["globalRole"], opts: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: role,
    memberGroupIds: new Set([GROUP]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
    ...opts,
  };
}
const member = ctxFor("MEMBER");

function task(id: string, extra: Partial<FakeTask> & { position: number }): FakeTask {
  return {
    id,
    rawText: id,
    workId: WORK,
    sectorId: null,
    objectiveId: null,
    parentId: null,
    statusId: "pendiente",
    status: statusRef("pendiente"),
    links: [],
    ...extra,
  };
}

const byId = (id: string) => db.tasks.find((t) => t.id === id)!;

beforeEach(() => {
  vi.clearAllMocks();
  db.nextId = 0;
  db.works = [
    { id: WORK, name: "Obra", groupId: GROUP, ownerId: null, status: "ACTIVE", isTemplate: false },
    { id: OTRO, name: "Otro", groupId: GROUP, ownerId: null, status: "ACTIVE", isTemplate: false },
  ];
  db.objectives = [
    { id: OBJ, workId: WORK },
    { id: OBJ_OTRO, workId: OTRO },
  ];
  db.tasks = [
    task("general-0", { position: 0 }),
    task("general-1", { position: 1 }),
    task("general-2", { position: 2 }),
    task("obj-0", { objectiveId: OBJ, position: 0 }),
    task("obj-hija", { objectiveId: OBJ, parentId: "obj-0", position: 0 }),
    task("otro-0", { workId: OTRO, position: 0 }),
  ];
});

describe("saveTask — alta dentro de un objetivo (contextObjectiveId)", () => {
  it("toma el proyecto del objetivo y va al final de ESE objetivo (no de las generales)", async () => {
    const created = await saveTask(member, { rawText: "revisar planos", contextObjectiveId: OBJ });

    expect(created).toMatchObject({ workId: WORK, objectiveId: OBJ, position: 1, parentId: null });
  });

  it("con contextWorkId de otro proyecto → 400 OBJECTIVE_WORK_MISMATCH sin crear nada", async () => {
    const before = db.tasks.length;
    await expect(
      saveTask(member, { rawText: "x", contextObjectiveId: OBJ, contextWorkId: OTRO }),
    ).rejects.toMatchObject({ status: 400, code: "OBJECTIVE_WORK_MISMATCH" });
    expect(db.tasks).toHaveLength(before);
  });

  it("objetivo inexistente → 404", async () => {
    await expect(
      saveTask(member, { rawText: "x", contextObjectiveId: "nope" }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("sin operar el proyecto del objetivo (READER) → 403", async () => {
    const reader = ctxFor("READER", {
      memberGroupIds: new Set(),
      readerGroupIds: new Set([GROUP]),
    });
    await expect(saveTask(reader, { rawText: "x", contextObjectiveId: OBJ })).rejects.toMatchObject(
      {
        status: 403,
      },
    );
  });

  it("un `/Otro` explícito manda la tarea a Otro como GENERAL (el objetivo es de Obra)", async () => {
    const created = await saveTask(member, {
      rawText: "/Otro pedir presupuesto",
      contextObjectiveId: OBJ,
    });

    expect(created).toMatchObject({ workId: OTRO, objectiveId: null, position: 1 });
  });
});

describe("saveTask — subtareas y objetivo", () => {
  it("una hija hereda el objetivo del padre y se ignora contextObjectiveId", async () => {
    const created = await saveTask(member, {
      rawText: "segunda hija",
      parentId: "obj-0",
      contextObjectiveId: "cualquiera",
    });

    expect(created).toMatchObject({
      parentId: "obj-0",
      workId: WORK,
      objectiveId: OBJ,
      position: 1,
    });
  });

  it("una hija de una general no tiene objetivo", async () => {
    const created = await saveTask(member, { rawText: "hija", parentId: "general-0" });
    expect(created).toMatchObject({ parentId: "general-0", objectiveId: null, position: 0 });
  });
});

describe("saveTask — edición", () => {
  it("`/Otro` limpia el objetivo, va al final de las generales del destino y muda a las hijas", async () => {
    const updated = await saveTask(member, {
      taskId: "obj-0",
      rawText: "/Otro coordinar",
      contextWorkId: WORK,
    });

    expect(updated).toMatchObject({ workId: OTRO, objectiveId: null, position: 1 });
    expect(byId("obj-hija")).toMatchObject({
      workId: OTRO,
      objectiveId: null,
      parentId: "obj-0",
      position: 0,
    });
    // El proyecto viejo se entera para sacar la tarea (y su hija) de su lista.
    expect(emit).toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });

  it("sin mudanza conserva objetivo y posición", async () => {
    const updated = await saveTask(member, {
      taskId: "obj-0",
      rawText: "texto nuevo",
      contextWorkId: WORK,
    });

    expect(updated).toMatchObject({ workId: WORK, objectiveId: OBJ, position: 0 });
    expect(emit).not.toHaveBeenCalledWith({ type: "work-changed", workId: WORK });
  });
});
