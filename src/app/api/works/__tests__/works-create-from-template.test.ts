import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * objetivos: alta de proyecto desde plantilla (`POST /api/works` con
 * `cloneFromId`, vía `createWork`) y el 409 de convertir en plantilla un
 * proyecto con objetivos (`PATCH /api/works/[id] {isTemplate:true}`).
 *
 * El clonado se mockea (lo cubre tests/unit/clone-template.test.ts): acá se
 * verifica el contrato — acceso de lectura a la plantilla, objetivo insertado
 * en la MISMA transacción que el proyecto, plantilla desde plantilla como
 * tareas generales y el evento.
 */

const GROUP_A = "11111111-1111-4111-8111-111111111111";
const GROUP_B = "22222222-2222-4222-8222-222222222222";
const TPL_GROUP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TPL_GROUP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TPL_ARCHIVED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOT_TEMPLATE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const TPL_OTHER_PERSONAL = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PROJECT_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const authState = vi.hoisted(() => ({
  role: "MEMBER" as "MEMBER" | "READER" | "SUPERADMIN",
  memberGroupIds: [] as string[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: authState.role },
  })),
}));

const userContext = () => ({
  id: "user-1",
  globalRole: authState.role,
  memberGroupIds: new Set(authState.memberGroupIds),
  adminGroupIds: new Set<string>(),
  grantedSectorIds: new Set<string>(),
  readerGroupIds: new Set<string>(),
  clientWorkIds: new Set<string>(),
});

vi.mock("@/server/user-context", () => ({ getUserContext: vi.fn(async () => userContext()) }));

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  insertTemplateAsObjectiveTx: vi.fn(),
  cloneTaskTree: vi.fn(),
}));

vi.mock("@/server/events", () => ({ emit: mocks.emit }));

vi.mock("@/lib/domain/works/cloneFromTemplate", () => ({
  insertTemplateAsObjectiveTx: mocks.insertTemplateAsObjectiveTx,
  cloneTaskTree: mocks.cloneTaskTree,
}));

type FakeWork = {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  status: "ACTIVE" | "ARCHIVED";
  groupId: string | null;
  ownerId: string | null;
  group: { id: string; name: string; publicRead: boolean } | null;
  stage: null;
  nextcloudFolderPath: null;
};

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  objectiveCount: 0,
  inTransaction: false,
  txClient: null as unknown,
}));

vi.mock("@/lib/db/client", () => {
  const tx = {
    work: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const work = { id: "new-work", ...data, group: null };
        return work;
      }),
    },
  };
  const client = {
    work: {
      findFirst: vi.fn(async ({ where }: { where: { name: string; groupId: string | null; ownerId: string | null } }) =>
        db.works.find(
          (w) => w.name === where.name && w.groupId === where.groupId && w.ownerId === where.ownerId,
        ) ?? null,
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => db.works.find((w) => w.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        ...db.works.find((w) => w.id === where.id),
        ...data,
      })),
    },
    objective: {
      count: vi.fn(async () => db.objectiveCount),
    },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => {
      db.inTransaction = true;
      db.txClient = tx;
      try {
        return await fn(tx);
      } finally {
        db.inTransaction = false;
      }
    }),
  };
  return { prisma: client };
});

const { POST } = await import("@/app/api/works/route");
const { PATCH } = await import("@/app/api/works/[id]/route");
const { createWork } = await import("@/server/works");

function work(overrides: Partial<FakeWork> & { id: string }): FakeWork {
  return {
    name: overrides.id,
    description: null,
    isTemplate: false,
    status: "ACTIVE",
    groupId: null,
    ownerId: "user-1",
    group: null,
    stage: null,
    nextcloudFolderPath: null,
    ...overrides,
  };
}

function post(body: unknown) {
  return POST(new Request("http://localhost/api/works", { method: "POST", body: JSON.stringify(body) }), undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.role = "MEMBER";
  authState.memberGroupIds = [GROUP_A];
  db.objectiveCount = 0;
  db.works = [
    work({
      id: TPL_GROUP_A,
      name: "Instalación",
      description: "Receta",
      isTemplate: true,
      groupId: GROUP_A,
      ownerId: null,
      group: { id: GROUP_A, name: "A", publicRead: false },
    }),
    work({
      id: TPL_GROUP_B,
      isTemplate: true,
      groupId: GROUP_B,
      ownerId: null,
      group: { id: GROUP_B, name: "B", publicRead: false },
    }),
    work({ id: TPL_ARCHIVED, isTemplate: true, status: "ARCHIVED" }),
    work({ id: NOT_TEMPLATE }),
    work({ id: TPL_OTHER_PERSONAL, isTemplate: true, ownerId: "user-2" }),
    work({ id: PROJECT_ID, name: "Obra" }),
  ];
  mocks.insertTemplateAsObjectiveTx.mockImplementation(async (tx: unknown) => {
    // El objetivo se inserta dentro de la transacción del alta.
    expect(db.inTransaction).toBe(true);
    expect(tx).toBe(db.txClient);
    return { objective: { id: "obj-1", title: "Instalación" }, tasks: [], copiedTasks: 3, sectorIds: [] };
  });
  mocks.cloneTaskTree.mockImplementation(async () => {
    expect(db.inTransaction).toBe(true);
    return { tasks: [], copiedTasks: 2, sectorIds: [] };
  });
});

describe("POST /api/works con cloneFromId", () => {
  it("crea el proyecto con la plantilla insertada como objetivo (título = nombre de la plantilla)", async () => {
    const res = await post({ name: "Casa Pérez", groupId: GROUP_A, cloneFromId: TPL_GROUP_A });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string; isTemplate: boolean };
    expect(body).toMatchObject({ id: "new-work", name: "Casa Pérez", isTemplate: false });
    expect(mocks.insertTemplateAsObjectiveTx).toHaveBeenCalledTimes(1);
    expect(mocks.insertTemplateAsObjectiveTx.mock.calls[0][1]).toEqual({
      workId: "new-work",
      template: expect.objectContaining({ id: TPL_GROUP_A, name: "Instalación", description: "Receta" }),
      title: undefined,
      actorId: "user-1",
    });
    expect(mocks.cloneTaskTree).not.toHaveBeenCalled();
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: "new-work" });
  });

  it("objetivos: avisa a los sectores vinculados de las tareas copiadas", async () => {
    mocks.insertTemplateAsObjectiveTx.mockResolvedValueOnce({
      objective: { id: "obj-1", title: "Instalación" },
      tasks: [{ id: "copia-1" }],
      copiedTasks: 1,
      sectorIds: ["sector-1"],
    });

    await post({ name: "Casa Pérez", groupId: GROUP_A, cloneFromId: TPL_GROUP_A });

    expect(mocks.emit).toHaveBeenCalledWith({
      type: "task-changed",
      taskId: "copia-1",
      workId: "new-work",
      sectorIds: ["sector-1"],
    });
    expect(mocks.emit).toHaveBeenCalledWith({ type: "work-changed", workId: "new-work" });
  });

  it("acepta un título de objetivo propio", async () => {
    await post({ name: "Casa Pérez", groupId: GROUP_A, cloneFromId: TPL_GROUP_A, objectiveTitle: "Tablero PB" });

    expect(mocks.insertTemplateAsObjectiveTx.mock.calls[0][1]).toMatchObject({ title: "Tablero PB" });
  });

  it.each([
    ["de un grupo sin acceso", TPL_GROUP_B],
    ["personal de otro usuario", TPL_OTHER_PERSONAL],
    ["archivada", TPL_ARCHIVED],
    ["que no es plantilla", NOT_TEMPLATE],
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
  ])("plantilla %s → 400 con el mismo mensaje y sin crear nada", async (_caso, templateId) => {
    const res = await post({ name: "Casa Pérez", cloneFromId: templateId });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "La plantilla seleccionada no existe o no está activa",
    );
    const { prisma } = await import("@/lib/db/client");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
  });

  it("una plantilla de un grupo con lectura pública se puede copiar", async () => {
    db.works.find((w) => w.id === TPL_GROUP_B)!.group!.publicRead = true;

    const res = await post({ name: "Casa Pérez", cloneFromId: TPL_GROUP_B });

    expect(res.status).toBe(201);
    expect(mocks.insertTemplateAsObjectiveTx).toHaveBeenCalledTimes(1);
  });

  it("isTemplate + cloneFromId: plantilla desde plantilla, tareas como generales y sin objetivo", async () => {
    const res = await post({ name: "Instalación v2", cloneFromId: TPL_GROUP_A, isTemplate: true });

    expect(res.status).toBe(201);
    expect(((await res.json()) as { isTemplate: boolean }).isTemplate).toBe(true);
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
    expect(mocks.cloneTaskTree.mock.calls[0][1]).toEqual({
      sourceWhere: { workId: TPL_GROUP_A },
      destWorkId: "new-work",
      destObjectiveId: null,
      actorId: "user-1",
    });
  });

  it("sin cloneFromId crea el proyecto vacío (compat de la UI actual)", async () => {
    const res = await post({ name: "Nuevo", groupId: null });

    expect(res.status).toBe(201);
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
    expect(mocks.cloneTaskTree).not.toHaveBeenCalled();
  });

  it("nombre repetido en el ámbito → 409 antes de mirar la plantilla", async () => {
    const res = await post({ name: "Obra", cloneFromId: TPL_GROUP_A });

    expect(res.status).toBe(409);
    expect(mocks.insertTemplateAsObjectiveTx).not.toHaveBeenCalled();
  });

  it("grupo del que no es miembro → 403", async () => {
    const res = await post({ name: "Casa", groupId: GROUP_B, cloneFromId: TPL_GROUP_A });

    expect(res.status).toBe(403);
  });
});

describe("createWork", () => {
  it("un rol sin escritura (READER por MCP) no crea proyectos", async () => {
    authState.role = "READER";

    await expect(createWork(userContext(), { name: "Mío" })).rejects.toMatchObject({ status: 403 });
  });

  it("devuelve el objetivo insertado, la cantidad copiada y la plantilla", async () => {
    const result = await createWork(userContext(), { name: "Casa", templateId: TPL_GROUP_A });

    expect(result).toMatchObject({
      objective: { id: "obj-1" },
      copiedTasks: 3,
      template: { id: TPL_GROUP_A, name: "Instalación" },
    });
  });
});

describe("PATCH /api/works/[id] {isTemplate:true}", () => {
  const patch = (body: unknown) =>
    PATCH(new Request(`http://localhost/api/works/${PROJECT_ID}`, { method: "PATCH", body: JSON.stringify(body) }), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

  it("un proyecto con objetivos → 409 OBJECTIVES_PRESENT sin tocar el proyecto", async () => {
    db.objectiveCount = 2;

    const res = await patch({ isTemplate: true });

    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("OBJECTIVES_PRESENT");
    const { prisma } = await import("@/lib/db/client");
    expect(prisma.work.update).not.toHaveBeenCalled();
  });

  it("un proyecto sin objetivos se convierte en plantilla", async () => {
    const res = await patch({ isTemplate: true });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { isTemplate: boolean }).isTemplate).toBe(true);
  });
});
