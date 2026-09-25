import { describe, it, expect } from "vitest";
import { cloneTaskTree, insertTemplateAsObjectiveTx } from "@/lib/domain/works/cloneFromTemplate";

/**
 * objetivos: clonado de un árbol de tareas (plan §3, crítica I2). Mock
 * in-memory de un Prisma TransactionClient que cubre solo lo que usan
 * `cloneTaskTree` e `insertTemplateAsObjectiveTx` (y `loadApplicableStatusSet`
 * / `nextPosition` por debajo): task.findMany/create/aggregate,
 * work.findUnique(OrThrow), sector.findMany/findUnique, user.findMany,
 * taskStatus.findMany, taskStatusChange.createMany, objective.create/aggregate.
 */

type Where = Record<string, unknown>;

type SrcLink = {
  type: "EXEC" | "REF";
  targetType: "SECTOR" | "USER";
  targetId: string;
  sectorId: string | null;
  userId: string | null;
};

type SrcLabel = { keyId: string; valueId: string; key: { groupId: string | null; ownerId: string | null } };

type SrcTask = {
  id: string;
  rawText: string;
  displayText: string;
  description: string | null;
  status: { type: "IN_PROGRESS" | "FINAL" };
  workId: string | null;
  objectiveId: string | null;
  parentId: string | null;
  position: number;
  createdAt: Date;
  links: SrcLink[];
  labels: SrcLabel[];
};

type CreatedTask = {
  id: string;
  rawText: string;
  displayText: string;
  description: string | null;
  dueDate: Date | null;
  statusId: string;
  workId: string;
  objectiveId: string | null;
  sectorId: string | null;
  originType: string;
  creatorId: string;
  parentId: string | null;
  position: number;
  links: { create: Omit<SrcLink, never>[] };
  labels: { create: { keyId: string; valueId: string }[] };
};

type MockStatus = {
  id: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
  name: string;
  color: string;
};

const GROUP_DEST = "group-dest";
const ACTOR = "u-actor";

const DEST_STATUSES: MockStatus[] = [
  { id: "dest-pendiente", type: "IN_PROGRESS", sortOrder: 0, groupId: GROUP_DEST, ownerId: null, sectorId: null, name: "Pendiente", color: "" },
  { id: "dest-hecha", type: "FINAL", sortOrder: 1, groupId: GROUP_DEST, ownerId: null, sectorId: null, name: "Hecha", color: "" },
];

let seq = 0;
function src(overrides: Partial<SrcTask> & { id: string }): SrcTask {
  return {
    rawText: overrides.id,
    displayText: overrides.id,
    description: null,
    status: { type: "IN_PROGRESS" },
    workId: "template-1",
    objectiveId: null,
    parentId: null,
    position: 0,
    createdAt: new Date(2026, 0, 1, 0, 0, seq++),
    links: [],
    labels: [],
    ...overrides,
  };
}

function matches(task: SrcTask, where: Where, all: SrcTask[]): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Where[]).some((w) => matches(task, w, all));
    if (k === "status") return task.status.type === (v as { type: string }).type;
    if (k === "parent") {
      const parent = all.find((t) => t.id === task.parentId);
      return parent !== undefined && matches(parent, v as Where, all);
    }
    return (task as unknown as Record<string, unknown>)[k] === v;
  });
}

function createMockTx(opts: {
  tasks: SrcTask[];
  sectors?: { id: string; groupId: string | null; ownerId: string | null }[];
  users?: { id: string; globalRole: string }[];
  destWork?: { groupId: string | null; ownerId: string | null };
  statuses?: MockStatus[];
  /** Tareas que ya existen en el destino (para `nextPosition`). */
  destExisting?: { workId: string; objectiveId: string | null; parentId: string | null; position: number }[];
  objectivesMaxPosition?: number | null;
}) {
  const {
    tasks,
    sectors = [],
    users = [],
    destWork = { groupId: GROUP_DEST, ownerId: null },
    statuses = DEST_STATUSES,
    destExisting = [],
    objectivesMaxPosition = null,
  } = opts;
  const created: CreatedTask[] = [];
  const statusChanges: { taskId: string; fromStatusId: string | null; toStatusId: string; changedById: string }[] = [];
  const createdObjectives: Record<string, unknown>[] = [];
  const calls = { taskStatusFindMany: 0, taskFindManyWhere: null as Where | null, taskFindManyOrderBy: null as unknown };
  let idCounter = 0;

  const tx = {
    task: {
      async findMany({ where, orderBy }: { where: Where; orderBy: unknown }) {
        calls.taskFindManyWhere = where;
        calls.taskFindManyOrderBy = orderBy;
        return tasks
          .filter((t) => matches(t, where, tasks))
          .sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime())
          .map((t) => ({ ...t, links: t.links.map((l) => ({ ...l })) }));
      },
      async aggregate({ where }: { where: Where }) {
        const pool = [...destExisting, ...created];
        const inScope = pool.filter((t) =>
          Object.entries(where).every(([k, v]) => (t as unknown as Record<string, unknown>)[k] === v),
        );
        return { _max: { position: inScope.length ? Math.max(...inScope.map((t) => t.position)) : null } };
      },
      async create({ data }: { data: Omit<CreatedTask, "id"> }) {
        const row = { ...data, id: `new-${idCounter++}` } as CreatedTask;
        created.push(row);
        return row;
      },
    },
    work: {
      async findUniqueOrThrow() {
        return { ...destWork };
      },
      async findUnique({ where }: { where: { id: string } }) {
        return { id: where.id, ...destWork };
      },
    },
    sector: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return sectors.filter((s) => where.id.in.includes(s.id));
      },
      async findUnique({ where }: { where: { id: string } }) {
        return sectors.find((s) => s.id === where.id) ?? null;
      },
    },
    user: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return users.filter((u) => where.id.in.includes(u.id));
      },
    },
    taskStatus: {
      async findMany({ where }: { where: { OR: Record<string, unknown>[] } }) {
        calls.taskStatusFindMany++;
        return statuses.filter((s) =>
          where.OR.some((cond) =>
            Object.entries(cond).every(([k, v]) => (s as Record<string, unknown>)[k] === v),
          ),
        );
      },
    },
    taskStatusChange: {
      async createMany({ data }: { data: typeof statusChanges }) {
        statusChanges.push(...data);
        return { count: data.length };
      },
    },
    objective: {
      async aggregate() {
        return { _max: { position: objectivesMaxPosition } };
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const row = { ...data, id: `obj-${createdObjectives.length}` };
        createdObjectives.push(row);
        return row;
      },
    },
  };

  return { tx, created, statusChanges, createdObjectives, calls };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTx = (tx: unknown) => tx as any;

const base = { sourceWhere: { workId: "template-1" }, destWorkId: "work-new", destObjectiveId: "obj-1", actorId: ACTOR };

function byText(created: CreatedTask[], text: string) {
  const t = created.find((c) => c.rawText === text);
  if (!t) throw new Error(`no se copió "${text}"`);
  return t;
}

describe("cloneTaskTree", () => {
  it("copia solo las IN_PROGRESS y devuelve la cantidad copiada", async () => {
    const { tx, created } = createMockTx({
      tasks: [src({ id: "pendiente", position: 0 }), src({ id: "hecha", position: 1, status: { type: "FINAL" } })],
    });

    const result = await cloneTaskTree(asTx(tx), base);

    expect(result.copiedTasks).toBe(1);
    expect(result.tasks).toHaveLength(1);
    expect(created.map((c) => c.rawText)).toEqual(["pendiente"]);
  });

  it("sin tareas pendientes no crea nada ni escribe historial", async () => {
    const { tx, created, statusChanges } = createMockTx({
      tasks: [src({ id: "hecha", status: { type: "FINAL" } })],
    });

    const result = await cloneTaskTree(asTx(tx), base);

    expect(result).toEqual({ tasks: [], copiedTasks: 0 });
    expect(created).toHaveLength(0);
    expect(statusChanges).toHaveLength(0);
  });

  it("ordena por position (no por createdAt) y deja posiciones densas", async () => {
    const { tx, created, calls } = createMockTx({
      tasks: [
        src({ id: "tercera", position: 7, createdAt: new Date("2026-01-01") }),
        src({ id: "primera", position: 2, createdAt: new Date("2026-03-01") }),
        src({ id: "segunda", position: 4, createdAt: new Date("2026-02-01") }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(calls.taskFindManyOrderBy).toEqual([{ position: "asc" }, { createdAt: "asc" }]);
    expect(created.map((c) => [c.rawText, c.position])).toEqual([
      ["primera", 0],
      ["segunda", 1],
      ["tercera", 2],
    ]);
  });

  it("las raíces van al final de la sección destino si ya tenía tareas", async () => {
    const { tx, created } = createMockTx({
      tasks: [src({ id: "a", position: 0 }), src({ id: "b", position: 1 })],
      destExisting: [
        { workId: "work-new", objectiveId: null, parentId: null, position: 4 },
        { workId: "work-new", objectiveId: "obj-otro", parentId: null, position: 9 },
      ],
    });

    await cloneTaskTree(asTx(tx), { ...base, destObjectiveId: null });

    expect(created.map((c) => c.position)).toEqual([5, 6]);
  });

  it("conserva las subtareas: las hijas cuelgan del padre NUEVO con posiciones 0..k-1", async () => {
    const { tx, created } = createMockTx({
      tasks: [
        src({ id: "padre", position: 0 }),
        src({ id: "hija-b", parentId: "padre", position: 5 }),
        src({ id: "hija-a", parentId: "padre", position: 3 }),
        src({ id: "otra-raiz", position: 1 }),
      ],
    });

    const result = await cloneTaskTree(asTx(tx), base);

    const padre = byText(created, "padre");
    expect(result.copiedTasks).toBe(4);
    expect(byText(created, "hija-a")).toMatchObject({ parentId: padre.id, position: 0 });
    expect(byText(created, "hija-b")).toMatchObject({ parentId: padre.id, position: 1 });
    expect(byText(created, "otra-raiz")).toMatchObject({ parentId: null, position: 1 });
    // Proyecto y sección destino en raíces e hijas; sin sector propio.
    for (const c of created) {
      expect(c).toMatchObject({ workId: "work-new", objectiveId: "obj-1", sectorId: null });
    }
  });

  it("una hija pendiente de un padre terminado se copia como raíz, al final", async () => {
    const { tx, created } = createMockTx({
      tasks: [
        src({ id: "padre-hecho", position: 0, status: { type: "FINAL" } }),
        src({ id: "huerfana", parentId: "padre-hecho", position: 0 }),
        src({ id: "raiz", position: 1 }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created.map((c) => [c.rawText, c.parentId, c.position])).toEqual([
      ["raiz", null, 0],
      ["huerfana", null, 1],
    ]);
  });

  it("cada hija se atribuye a la sección de su raíz (origen por objetivo)", async () => {
    const { tx, created, calls } = createMockTx({
      tasks: [
        src({ id: "raiz-o1", workId: "work-a", objectiveId: "o1", position: 0 }),
        // Invariante roto: la hija dice o2 pero su raíz es de o1 → se copia.
        src({ id: "hija-rota", workId: "work-a", objectiveId: "o2", parentId: "raiz-o1" }),
        src({ id: "raiz-o2", workId: "work-a", objectiveId: "o2", position: 0 }),
        // Hija con o1 colgada de una raíz de o2 → no es de o1.
        src({ id: "hija-ajena", workId: "work-a", objectiveId: "o1", parentId: "raiz-o2" }),
      ],
    });

    await cloneTaskTree(asTx(tx), { ...base, sourceWhere: { objectiveId: "o1" } });

    expect(calls.taskFindManyWhere).toEqual({
      status: { type: "IN_PROGRESS" },
      OR: [{ objectiveId: "o1", parentId: null }, { parent: { objectiveId: "o1" } }],
    });
    expect(created.map((c) => c.rawText).sort()).toEqual(["hija-rota", "raiz-o1"]);
  });

  it("saca los tags /proyecto del rawText y recalcula displayText solo si cambió", async () => {
    const { tx, created } = createMockTx({
      tasks: [
        src({ id: "t1", rawText: "Cortar /ObraX chapa #Metal", displayText: "Cortar chapa", position: 0 }),
        src({ id: "t2", rawText: "Pintar #Metal", displayText: "Pintar (display guardado)", position: 1 }),
      ],
      sectors: [],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0].rawText).toBe("Cortar chapa #Metal");
    expect(created[0].displayText).toBe("Cortar chapa");
    expect(created[1].rawText).toBe("Pintar #Metal");
    expect(created[1].displayText).toBe("Pintar (display guardado)");
  });

  it("calcula dueDate desde el texto (como saveTask) y copia la descripción", async () => {
    const { tx, created } = createMockTx({
      tasks: [
        src({ id: "t1", rawText: "Entregar 15/10/2026", description: "Detalle", position: 0 }),
        src({ id: "t2", rawText: "Sin fecha", position: 1 }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0].dueDate).toEqual(new Date("2026-10-15"));
    expect(created[0].description).toBe("Detalle");
    expect(created[1].dueDate).toBeNull();
  });

  it("creador = actor, origen WORK", async () => {
    const { tx, created } = createMockTx({ tasks: [src({ id: "t1" })] });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0]).toMatchObject({ creatorId: ACTOR, originType: "WORK" });
  });

  it("copia vínculos solo a sectores del grupo destino, personales del actor o globales", async () => {
    const link = (type: "EXEC" | "REF", sectorId: string): SrcLink => ({
      type,
      targetType: "SECTOR",
      targetId: sectorId,
      sectorId,
      userId: null,
    });
    const { tx, created } = createMockTx({
      sectors: [
        { id: "s-grupo", groupId: GROUP_DEST, ownerId: null },
        { id: "s-otro-grupo", groupId: "group-otro", ownerId: null },
        { id: "s-personal-actor", groupId: null, ownerId: ACTOR },
        { id: "s-personal-ajeno", groupId: null, ownerId: "u-otro" },
        { id: "s-global", groupId: null, ownerId: null },
      ],
      tasks: [
        src({
          id: "t1",
          links: [
            link("EXEC", "s-grupo"),
            link("EXEC", "s-otro-grupo"),
            link("REF", "s-personal-actor"),
            link("REF", "s-personal-ajeno"),
            link("REF", "s-global"),
            link("REF", "s-inexistente"),
          ],
        }),
      ],
    });

    await expect(cloneTaskTree(asTx(tx), base)).resolves.toBeTruthy();

    expect(created[0].links.create.map((l) => l.targetId)).toEqual(["s-grupo", "s-personal-actor", "s-global"]);
    expect(created[0].links.create[0]).toEqual({
      type: "EXEC",
      targetType: "SECTOR",
      targetId: "s-grupo",
      sectorId: "s-grupo",
      userId: null,
    });
  });

  it("en un destino personal no copia vínculos a sectores de grupo", async () => {
    const { tx, created } = createMockTx({
      destWork: { groupId: null, ownerId: ACTOR },
      statuses: [
        { ...DEST_STATUSES[0], groupId: null, ownerId: ACTOR },
        { ...DEST_STATUSES[1], groupId: null, ownerId: ACTOR },
      ],
      sectors: [{ id: "s-grupo", groupId: GROUP_DEST, ownerId: null }],
      tasks: [
        src({
          id: "t1",
          links: [{ type: "EXEC", targetType: "SECTOR", targetId: "s-grupo", sectorId: "s-grupo", userId: null }],
        }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0].links.create).toEqual([]);
  });

  it("REF a usuario solo si es MEMBER o SUPERADMIN", async () => {
    const ref = (userId: string): SrcLink => ({
      type: "REF",
      targetType: "USER",
      targetId: userId,
      sectorId: null,
      userId,
    });
    const { tx, created } = createMockTx({
      users: [
        { id: "u-member", globalRole: "MEMBER" },
        { id: "u-super", globalRole: "SUPERADMIN" },
        { id: "u-client", globalRole: "CLIENT" },
        { id: "u-reader", globalRole: "READER" },
      ],
      tasks: [src({ id: "t1", links: [ref("u-member"), ref("u-super"), ref("u-client"), ref("u-reader"), ref("u-borrado")] })],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0].links.create.map((l) => l.userId)).toEqual(["u-member", "u-super"]);
  });

  it("copia solo las etiquetas cuya clave está disponible en el destino", async () => {
    const { tx, created } = createMockTx({
      tasks: [
        src({
          id: "t1",
          labels: [
            { keyId: "k-global", valueId: "v1", key: { groupId: null, ownerId: null } },
            { keyId: "k-grupo", valueId: "v2", key: { groupId: GROUP_DEST, ownerId: null } },
            { keyId: "k-otro-grupo", valueId: "v3", key: { groupId: "group-otro", ownerId: null } },
            { keyId: "k-personal", valueId: "v4", key: { groupId: null, ownerId: ACTOR } },
          ],
        }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created[0].labels.create).toEqual([
      { keyId: "k-global", valueId: "v1" },
      { keyId: "k-grupo", valueId: "v2" },
    ]);
  });

  it("estado inicial del conjunto del destino, resuelto una vez por combinación de EXEC", async () => {
    const exec = (sectorId: string): SrcLink => ({
      type: "EXEC",
      targetType: "SECTOR",
      targetId: sectorId,
      sectorId,
      userId: null,
    });
    const { tx, created, calls } = createMockTx({
      sectors: [{ id: "s-grupo", groupId: GROUP_DEST, ownerId: null }],
      tasks: [
        src({ id: "a", position: 0 }),
        src({ id: "b", position: 1 }),
        src({ id: "c", position: 2, links: [exec("s-grupo")] }),
        src({ id: "d", position: 3, links: [exec("s-grupo")] }),
      ],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(created.every((c) => c.statusId === "dest-pendiente")).toBe(true);
    expect(calls.taskStatusFindMany).toBe(2); // sin EXEC + con s-grupo
  });

  it("registra un TaskStatusChange inicial por cada copia", async () => {
    const { tx, created, statusChanges } = createMockTx({
      tasks: [src({ id: "padre", position: 0 }), src({ id: "hija", parentId: "padre" })],
    });

    await cloneTaskTree(asTx(tx), base);

    expect(statusChanges).toEqual(
      created.map((c) => ({ taskId: c.id, fromStatusId: null, toStatusId: "dest-pendiente", changedById: ACTOR })),
    );
  });
});

describe("insertTemplateAsObjectiveTx", () => {
  const template = { id: "template-1", name: "Instalación eléctrica", description: "Receta base" };

  it("crea el objetivo con el nombre de la plantilla, su descripción y el origen, al final", async () => {
    const { tx, createdObjectives, created } = createMockTx({
      tasks: [src({ id: "t1", position: 0 }), src({ id: "t2", position: 1 })],
      objectivesMaxPosition: 2,
    });

    const result = await insertTemplateAsObjectiveTx(asTx(tx), { workId: "work-new", template, actorId: ACTOR });

    expect(createdObjectives[0]).toEqual({
      id: "obj-0",
      workId: "work-new",
      title: "Instalación eléctrica",
      description: "Receta base",
      position: 3,
      sourceTemplateId: "template-1",
      createdById: ACTOR,
    });
    expect(result.copiedTasks).toBe(2);
    expect(result.objective.id).toBe("obj-0");
    expect(created.every((c) => c.objectiveId === "obj-0" && c.workId === "work-new")).toBe(true);
  });

  it("usa el título indicado (recortado) y cae al nombre si viene vacío", async () => {
    const first = createMockTx({ tasks: [] });
    await insertTemplateAsObjectiveTx(asTx(first.tx), {
      workId: "work-new",
      template,
      title: "  Tablero planta baja  ",
      actorId: ACTOR,
    });
    expect(first.createdObjectives[0]).toMatchObject({ title: "Tablero planta baja", position: 0 });

    const second = createMockTx({ tasks: [] });
    await insertTemplateAsObjectiveTx(asTx(second.tx), { workId: "work-new", template, title: "   ", actorId: ACTOR });
    expect(second.createdObjectives[0]).toMatchObject({ title: "Instalación eléctrica" });
  });

  it("toma como origen la plantilla completa y deja la descripción vacía en null", async () => {
    const { tx, createdObjectives, calls } = createMockTx({ tasks: [] });

    await insertTemplateAsObjectiveTx(asTx(tx), {
      workId: "work-new",
      template: { ...template, description: "" },
      actorId: ACTOR,
    });

    expect(createdObjectives[0]).toMatchObject({ description: null });
    expect(calls.taskFindManyWhere).toEqual({
      status: { type: "IN_PROGRESS" },
      OR: [{ workId: "template-1", parentId: null }, { parent: { workId: "template-1" } }],
    });
  });
});
