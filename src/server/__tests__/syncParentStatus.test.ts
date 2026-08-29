import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El espejo se prueba contra un dataset en memoria, mismo patrón que
 * setTaskStatus.test.ts: interesa la decisión y el efecto, no el SQL.
 */
const db = vi.hoisted(() => ({
  tasks: [] as {
    id: string;
    parentId: string | null;
    statusId: string;
    workId: string | null;
    sectorId: string | null;
    status: { id: string; type: "IN_PROGRESS" | "FINAL" };
    // 062-subtareas: antes tipado `[]` (tupla vacía); ahora acepta EXEC links
    // reales de fixture para probar la herencia de la hija (ruling 2026-08-29).
    links: { type: "EXEC" | "REF"; sectorId: string | null }[];
    position?: number;
  }[],
  statusChanges: [] as { taskId: string; fromStatusId: string | null; toStatusId: string }[],
  nextId: 0,
}));

const SET = [
  { id: "pendiente", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const, sortOrder: 0, groupId: null, ownerId: null, sectorId: null },
  { id: "hecha", name: "Hecha", color: "#22c55e", type: "FINAL" as const, sortOrder: 1, groupId: null, ownerId: null, sectorId: null },
];

// 062-subtareas: catálogo de sectores para el escenario de herencia de EXEC
// (ruling 2026-08-29) — permite que `#Marketing` en el texto de una hija
// resuelva a un sector real, distinto del que ya tiene el padre.
const SECTOR_VENTAS_ID = "sector-ventas";
const SECTOR_MARKETING_ID = "sector-marketing";
const SECTOR_CATALOG = [
  { id: SECTOR_VENTAS_ID, name: "Ventas", groupId: null, ownerId: null, group: null },
  { id: SECTOR_MARKETING_ID, name: "Marketing", groupId: null, ownerId: null, group: null },
];

/**
 * loadApplicableStatusSet (no mockeada: se usa la real) resuelve el scope de la
 * tarea contra work/sector antes de llegar al conjunto de estados, así que el
 * mock de prisma también tiene que cubrir esas consultas y `taskStatus`, no solo
 * `task`/`taskStatusChange` — si no, revienta con "Cannot read properties of
 * undefined" apenas syncParentStatus intenta resolver el conjunto aplicable.
 */
vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      // 062-subtareas: si el `include` pide `links` filtrados por `type`
      // (como hace saveTask para heredar los EXEC del padre), el mock filtra
      // de verdad — así el test cae en RED si `saveTask` deja de pedir el
      // filtro en vez de pasar por casualidad con `links` sin filtrar.
      findUnique: vi.fn(
        async ({
          where: { id },
          include,
        }: {
          where: { id: string };
          include?: { links?: { where?: { type?: "EXEC" | "REF" } } };
        }) => {
          const t = db.tasks.find((x) => x.id === id);
          if (!t) return null;
          const linkType = include?.links?.where?.type;
          return { ...t, links: linkType ? t.links.filter((l) => l.type === linkType) : t.links };
        },
      ),
      findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks.filter((t) => t.parentId === where.parentId),
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: {
            statusId: string;
            links?: { create?: { type: "EXEC" | "REF"; sectorId: string | null }[] };
          };
        }) => {
          const task = db.tasks.find((t) => t.id === id)!;
          task.statusId = data.statusId;
          task.status = { id: data.statusId, type: data.statusId === "hecha" ? "FINAL" : "IN_PROGRESS" };
          // 062-subtareas (hallazgo Importante B de revisión): el `update` real
          // reconstruye los links desde cero (`deleteMany` + `create`); el mock
          // tiene que reflejar eso para poder afirmar que la herencia sobrevive
          // a una edición de texto.
          if (data.links?.create) task.links = data.links.create;
          return task;
        },
      ),
      // Lo usa setTaskStatus para contar hijas abiertas antes de dejar cerrar al padre
      // a mano (Tarea 6). El resto de los tests de este archivo no lo tocan.
      count: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks.filter((t) => t.parentId === where.parentId && t.status.type !== "FINAL").length,
      ),
      // saveTask (Tarea 7): crea la subtarea y la agrega al dataset en memoria para
      // que el syncParentStatus() que corre a continuación (misma llamada) la vea
      // como hija nueva. 062-subtareas: también captura `data.links.create` (los
      // TaskLink anidados) para poder afirmar sobre la herencia de EXEC.
      create: vi.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & {
            links?: { create?: { type: "EXEC" | "REF"; sectorId: string | null }[] };
          };
        }) => {
          const statusId = data.statusId as string;
          const task = {
            id: `nueva-${db.nextId++}`,
            parentId: (data.parentId as string | null) ?? null,
            statusId,
            workId: (data.workId as string | null) ?? null,
            sectorId: (data.sectorId as string | null) ?? null,
            status: { id: statusId, type: (statusId === "hecha" ? "FINAL" : "IN_PROGRESS") as "IN_PROGRESS" | "FINAL" },
            links: data.links?.create ?? [],
            position: data.position as number,
          };
          db.tasks.push(task);
          return task;
        },
      ),
      // nextPosition (Tarea 7, feature 052): las hijas del mismo padre se ordenan
      // entre ellas (where.parentId), separadas de las tareas raíz.
      aggregate: vi.fn(async ({ where }: { where: { parentId: string | null; workId?: string | null } }) => {
        const positions = db.tasks
          .filter((t) => t.parentId === where.parentId)
          .map((t) => t.position)
          .filter((p): p is number => typeof p === "number");
        return { _max: { position: positions.length ? Math.max(...positions) : null } };
      }),
    },
    work: {
      // saveTask (Tarea 7) necesita un work "real" para heredar contexto del padre a
      // una subtarea (resolveTask exige que contextWorkId resuelva a algo). Devolverlo
      // sin groupId/ownerId propios no cambia el resultado de resolveApplicableStatusSet
      // frente al `null` anterior: en ambos casos cae al fallback global (SET no tiene
      // groupId/ownerId propios), así que los 7 tests preexistentes siguen viendo lo mismo.
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === "work-1" ? { id: "work-1", groupId: null, ownerId: null } : null,
      ),
    },
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        SECTOR_CATALOG.find((s) => s.id === id) ?? null,
      ),
      // Dos formas de llamada: toTaskRef (permisos) pide `{ where: { id: { in } } }`
      // para resolver los sectores de una tarea puntual; resolveTask llama sin
      // argumentos para traer el catálogo completo de sectores del ámbito (#/@) —
      // necesario desde 062-subtareas para el escenario de herencia de EXEC
      // (`#Marketing` tiene que poder resolver a un sector real).
      findMany: vi.fn(async (args?: { where?: { id: { in: string[] } } }) =>
        args?.where ? args.where.id.in.map((id) => ({ id, groupId: null, ownerId: null, group: null })) : SECTOR_CATALOG,
      ),
    },
    taskStatus: {
      findMany: vi.fn(async () => SET),
      count: vi.fn(async () => SET.length),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    taskStatusChange: {
      create: vi.fn(async ({ data }: { data: { taskId: string; fromStatusId: string | null; toStatusId: string } }) => {
        db.statusChanges.push(data);
        return data;
      }),
    },
  },
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

const { syncParentStatus } = await import("@/server/tasks");

function seedParent(
  parentType: "IN_PROGRESS" | "FINAL",
  childTypes: ("IN_PROGRESS" | "FINAL")[],
  parentLinks: { type: "EXEC" | "REF"; sectorId: string | null }[] = [],
) {
  const parentStatusId = parentType === "FINAL" ? "hecha" : "pendiente";
  db.tasks = [
    { id: "padre", parentId: null, statusId: parentStatusId, workId: "work-1", sectorId: null, status: { id: parentStatusId, type: parentType }, links: parentLinks },
    ...childTypes.map((type, i) => {
      const statusId = type === "FINAL" ? "hecha" : "pendiente";
      return { id: `hija-${i}`, parentId: "padre", statusId, workId: "work-1", sectorId: null, status: { id: statusId, type }, links: [] };
    }),
  ];
  db.statusChanges = [];
}

describe("syncParentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cierra al padre cuando la última hija se finaliza", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "FINAL"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
    expect(db.statusChanges).toContainEqual({ taskId: "padre", fromStatusId: "pendiente", toStatusId: "hecha", changedById: "user-1" });
  });

  it("reabre al padre cuando una hija vuelve a estar abierta", async () => {
    seedParent("FINAL", ["FINAL", "IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("no hace nada cuando el padre ya está del lado correcto", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });

  it("no hace nada si la tarea ya no tiene hijas", async () => {
    seedParent("IN_PROGRESS", []);
    await syncParentStatus("padre", "user-1");
    expect(db.statusChanges).toEqual([]);
  });
});

describe("setTaskStatus con subtareas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza finalizar un padre con hijas abiertas", async () => {
    seedParent("IN_PROGRESS", ["FINAL", "IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-1",
      globalRole: "SUPERADMIN" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set<string>(),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await expect(setTaskStatus(ctx, "padre", "hecha")).rejects.toMatchObject({
      status: 409,
      code: "PARENT_HAS_OPEN_SUBTASKS",
    });
    // El padre no se tocó: sigue como antes de la llamada rechazada.
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("una hija delegada cierra al padre aunque el usuario no opere el padre", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    // La hija vive en un sector que el usuario opera por grant; el padre está en un
    // proyecto ajeno. El espejo NO valida permisos sobre el padre (ver syncParentStatus).
    db.tasks.find((t) => t.id === "hija-0")!.sectorId = "sector-delegado";
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-2",
      globalRole: "MEMBER" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set(["sector-delegado"]),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await setTaskStatus(ctx, "hija-0", "hecha");

    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("hecha");
  });

  it("permite mover el padre entre estados IN_PROGRESS", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    const { setTaskStatus } = await import("@/server/tasks");
    const ctx = {
      id: "user-1",
      globalRole: "SUPERADMIN" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set<string>(),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    await expect(setTaskStatus(ctx, "padre", "pendiente")).resolves.toBeDefined();
  });
});

describe("crear subtarea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("la hija hereda proyecto y sector del padre, y reabre al padre finalizado", async () => {
    seedParent("FINAL", ["FINAL"]);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    const hija = await saveTask(ctx, { rawText: "revisar con Ana", parentId: "padre" });

    expect(hija.parentId).toBe("padre");
    expect(hija.workId).toBe("work-1");
    expect(db.tasks.find((t) => t.id === "padre")!.statusId).toBe("pendiente");
  });

  it("rechaza /proyecto en el texto de una subtarea", async () => {
    seedParent("IN_PROGRESS", []);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(saveTask(ctx, { rawText: "revisar /otro-proyecto", parentId: "padre" })).rejects.toMatchObject({
      code: "SUBTASK_WORK_TAG",
    });
  });

  it("rechaza colgar una subtarea de otra subtarea", async () => {
    seedParent("IN_PROGRESS", ["IN_PROGRESS"]);
    const { saveTask } = await import("@/server/tasks");
    const ctx = { id: "user-1", globalRole: "SUPERADMIN" as const, memberGroupIds: new Set<string>(), adminGroupIds: new Set<string>(), grantedSectorIds: new Set<string>(), readerGroupIds: new Set<string>(), clientWorkIds: new Set<string>() };

    await expect(saveTask(ctx, { rawText: "nieta", parentId: "hija-0" })).rejects.toMatchObject({
      status: 400,
    });
  });

  describe("062-subtareas: herencia de EXEC (ruling 2026-08-29, revisión Tarea 11)", () => {
    const ctx = {
      id: "user-1",
      globalRole: "SUPERADMIN" as const,
      memberGroupIds: new Set<string>(),
      adminGroupIds: new Set<string>(),
      grantedSectorIds: new Set<string>(),
      readerGroupIds: new Set<string>(),
      clientWorkIds: new Set<string>(),
    };

    it("una hija sin # propio hereda los EXEC del padre", async () => {
      // Padre de proyecto con EXEC a Ventas; sin esto, la hija no tendría
      // NINGÚN vínculo con ningún sector y quedaría un pendiente invisible
      // (el padre es contenedor y no suma; la hija no aparece en ningún lado).
      seedParent("IN_PROGRESS", [], [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }]);
      const { saveTask } = await import("@/server/tasks");

      const hija = await saveTask(ctx, { rawText: "revisar con Ana", parentId: "padre" });

      expect(hija.links).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "EXEC", sectorId: SECTOR_VENTAS_ID })]),
      );
    });

    it("una hija con #Marketing NO hereda los EXEC del padre — vale la delegación explícita", async () => {
      seedParent("IN_PROGRESS", [], [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }]);
      const { saveTask } = await import("@/server/tasks");

      const hija = await saveTask(ctx, { rawText: "revisar con Ana #Marketing", parentId: "padre" });

      const execSectorIds = hija.links.filter((l) => l.type === "EXEC").map((l) => l.sectorId);
      expect(execSectorIds).toEqual([SECTOR_MARKETING_ID]);
      expect(execSectorIds).not.toContain(SECTOR_VENTAS_ID);
    });

    it("un padre sin ningún EXEC propio deja a la hija sin heredar nada (no explota, `links` queda vacío)", async () => {
      seedParent("IN_PROGRESS", [], []);
      const { saveTask } = await import("@/server/tasks");

      const hija = await saveTask(ctx, { rawText: "revisar con Ana", parentId: "padre" });

      expect(hija.links.filter((l) => l.type === "EXEC")).toEqual([]);
    });

    it("hallazgo Importante B (revisión Tarea 11): editar el texto de una hija (sin mandar parentId) conserva el EXEC heredado", async () => {
      // La hija YA existe con el EXEC heredado (como si una edición anterior
      // lo hubiera puesto ahí); el camino de edición real NO manda `parentId`
      // (src/app/api/tasks/[id]/route.ts, src/lib/mcp/tools/tasks.ts) y el
      // `update` reconstruye `links` desde cero — sin este arreglo, esta
      // edición borraba el EXEC en silencio.
      seedParent("IN_PROGRESS", ["IN_PROGRESS"], [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }]);
      db.tasks.find((t) => t.id === "hija-0")!.links = [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }];
      const { saveTask } = await import("@/server/tasks");

      const editada = await saveTask(ctx, {
        rawText: "texto editado, sin tag propio",
        taskId: "hija-0",
        contextWorkId: "work-1",
      });

      expect(editada.links).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "EXEC", sectorId: SECTOR_VENTAS_ID })]),
      );
    });

    it("hallazgo Importante B: editar con #Marketing propio reemplaza (no suma) al EXEC heredado", async () => {
      seedParent("IN_PROGRESS", ["IN_PROGRESS"], [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }]);
      db.tasks.find((t) => t.id === "hija-0")!.links = [{ type: "EXEC", sectorId: SECTOR_VENTAS_ID }];
      const { saveTask } = await import("@/server/tasks");

      const editada = await saveTask(ctx, {
        rawText: "texto editado #Marketing",
        taskId: "hija-0",
        contextWorkId: "work-1",
      });

      const execSectorIds = editada.links.filter((l) => l.type === "EXEC").map((l) => l.sectorId);
      expect(execSectorIds).toEqual([SECTOR_MARKETING_ID]);
      expect(execSectorIds).not.toContain(SECTOR_VENTAS_ID);
    });
  });
});
