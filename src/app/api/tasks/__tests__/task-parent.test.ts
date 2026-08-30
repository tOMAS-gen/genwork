import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tarea 8: PATCH /api/tasks/[id] con { parentId } — mover una tarea bajo otro
 * padre o promoverla a tarea independiente (parentId: null).
 *
 * Ids: el schema real usa z.string().uuid() (igual que el resto de las rutas
 * de /api/tasks), así que las tareas de prueba necesitan ids con forma de UUID
 * de verdad — no alcanza con strings arbitrarios como "padre"/"hija".
 *
 * @/server/tasks se mockea con importOriginal + spread (revisión final,
 * hallazgo Importante 5): la validación de mover/promover vive ahora en
 * `setTaskParent`, compartida con el MCP — así que ACÁ tiene que correr real
 * para seguir probando esa lógica (400 por self-parent, por otra pertenencia,
 * por hijas abiertas; herencia de EXEC; recálculo de `position`, hallazgo
 * Importante 4). `nextPosition` también real (la llama `setTaskParent`
 * internamente, misma módulo — mockearla aparte no la interceptaría). El
 * resto (getTaskOrThrow/toTaskRef para el gate de permisos —canToggle corta
 * en true para SUPERADMIN sin mirar el TaskRef—, syncParentStatus, saveTask)
 * sigue mockeado como no-op: no hace falta reproducir esas implementaciones
 * reales ni encadenar sus propias dependencias (parser de tags, resolución de
 * estados, taskStatus/work/sector).
 */

interface FakeStatus {
  id: string;
  type: "IN_PROGRESS" | "FINAL";
}

interface FakeTask {
  id: string;
  parentId: string | null;
  workId: string | null;
  sectorId: string | null;
  statusId: string;
  status: FakeStatus;
  // 062-subtareas (hallazgo Importante C de revisión): antes tipado `[]`
  // (tupla vacía); ahora acepta EXEC links reales de fixture para probar la
  // herencia al colgar una tarea de un padre (ruling 2026-08-29).
  links: { type: "EXEC" | "REF"; sectorId: string | null }[];
  // 062-subtareas (revisión final, hallazgo Importante 4): posición dentro de
  // su ámbito de hermanas — necesaria para que `nextPosition` (real, la usa
  // `setTaskParent`) tenga algo que agregar.
  position: number;
}

const PADRE_ID = randomUUID();
const OTRO_PADRE_ID = randomUUID();
const HIJA_ID = randomUUID();
const AJENA_ID = randomUUID();
const WORK_1 = randomUUID();
const WORK_2 = randomUUID();

// Fixtures de tareas sueltas de sector (sin workId), para probar que el rechazo
// por "otra pertenencia" también corta por sectorId y no solo por workId.
const PADRE_SECTOR_ID = randomUUID();
const HIJA_SECTOR_ID = randomUUID();
const PADRE_OTRO_SECTOR_ID = randomUUID();
const SECTOR_A = randomUUID();
const SECTOR_B = randomUUID();
const SECTOR_C = randomUUID();

// 062-subtareas (hallazgo Importante C): tarea suelta de proyecto, sin padre,
// para los escenarios de herencia de EXEC al colgarla de un padre.
const TAREA_SUELTA_ID = randomUUID();

const db = vi.hoisted(() => ({
  tasks: [] as FakeTask[],
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "U", globalRole: "SUPERADMIN" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "SUPERADMIN",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
  })),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

vi.mock("@/server/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/tasks")>();
  return {
    ...actual,
    getTaskOrThrow: vi.fn(async (id: string) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) throw new Error("Tarea no encontrada");
      return t;
    }),
    toTaskRef: vi.fn(async () => ({})),
    syncParentStatus: vi.fn(async () => {}),
    saveTask: vi.fn(),
    // setTaskParent y nextPosition quedan REALES (ver comentario de arriba).
  };
});

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.tasks.find((t) => t.id === id) ?? null,
      ),
      // 062-subtareas (revisión final, hallazgo Importante 6): DELETE lee las
      // hijas ANTES de borrar (sectorIds del cascade); el mock las expone con
      // el mismo shape que pide el select real (`links: { sectorId }`).
      findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
        db.tasks
          .filter((t) => t.parentId === where.parentId)
          .map((t) => ({ links: t.links.map((l) => ({ sectorId: l.sectorId })) })),
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: {
            parentId: string | null;
            position?: number;
            links?: { create?: { type: "EXEC" | "REF"; sectorId: string | null }[] };
          };
        }) => {
          const t = db.tasks.find((x) => x.id === id)!;
          t.parentId = data.parentId;
          // 062-subtareas (revisión final, hallazgo Importante 4): `setTaskParent`
          // real ahora manda `position` en el mismo update.
          if (data.position !== undefined) t.position = data.position;
          // 062-subtareas (hallazgo Importante C): el `update` real AGREGA los
          // links heredados (no los reemplaza) — a diferencia del reconstruye-
          // desde-cero de `saveTask`, acá no hay `deleteMany`.
          if (data.links?.create) t.links = [...t.links, ...data.links.create];
          return t;
        },
      ),
      count: vi.fn(
        async ({
          where,
        }: {
          where: { parentId: string; status?: { type: { not: string } } };
        }) =>
          db.tasks.filter(
            (t) =>
              t.parentId === where.parentId &&
              (!where.status || t.status.type !== where.status.type.not),
          ).length,
      ),
      // 062-subtareas (revisión final, hallazgo Importante 4): la usa
      // `nextPosition` (real) para calcular la posición dentro del nuevo
      // ámbito de hermanas — hijas del padre nuevo, o raíces del proyecto/
      // sector si se promueve.
      aggregate: vi.fn(
        async ({
          where,
        }: {
          where: { parentId: string | null; workId?: string | null; sectorId?: string | null };
        }) => {
          const positions = db.tasks
            .filter(
              (t) =>
                t.parentId === where.parentId &&
                (where.workId === undefined || t.workId === where.workId) &&
                (where.sectorId === undefined || t.sectorId === where.sectorId),
            )
            .map((t) => t.position);
          return { _max: { position: positions.length ? Math.max(...positions) : null } };
        },
      ),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const idx = db.tasks.findIndex((t) => t.id === id);
        const [deleted] = db.tasks.splice(idx, 1);
        // El cascade de la FK (onDelete: Cascade) se lleva las hijas junto con
        // el padre; lo reproducimos acá para que el fixture quede consistente.
        db.tasks = db.tasks.filter((t) => t.parentId !== id);
        return deleted;
      }),
    },
    taskLink: {
      // 062-subtareas (hallazgo Importante C): EXEC propios del padre, para
      // que la tarea que se cuelga pueda heredarlos.
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { taskId: string; type: "EXEC" | "REF" };
        }) => {
          const owner = db.tasks.find((t) => t.id === where.taskId);
          if (!owner) return [];
          return owner.links.filter((l) => l.type === where.type).map((l) => ({ sectorId: l.sectorId }));
        },
      ),
    },
  },
}));

const { PATCH, DELETE } = await import("@/app/api/tasks/[id]/route");
const { syncParentStatus } = await import("@/server/tasks");

function req(body: unknown) {
  return new Request("http://localhost/api/tasks/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  db.tasks = [
    { id: PADRE_ID, parentId: null, workId: WORK_1, sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: OTRO_PADRE_ID, parentId: null, workId: WORK_1, sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 1 },
    { id: HIJA_ID, parentId: PADRE_ID, workId: WORK_1, sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: AJENA_ID, parentId: null, workId: WORK_2, sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: PADRE_SECTOR_ID, parentId: null, workId: null, sectorId: SECTOR_A, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: HIJA_SECTOR_ID, parentId: PADRE_SECTOR_ID, workId: null, sectorId: SECTOR_A, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: PADRE_OTRO_SECTOR_ID, parentId: null, workId: null, sectorId: SECTOR_B, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 0 },
    { id: TAREA_SUELTA_ID, parentId: null, workId: WORK_1, sectorId: null, statusId: "pendiente", status: { id: "pendiente", type: "IN_PROGRESS" }, links: [], position: 2 },
  ];
});

describe("PATCH /api/tasks/[id] con parentId", () => {
  it("promueve una subtarea a tarea independiente", async () => {
    const res = await PATCH(req({ parentId: null }), params(HIJA_ID));
    expect(res.status).toBe(200);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBeNull();
  });

  it("mueve una tarea bajo otro padre del mismo proyecto", async () => {
    const res = await PATCH(req({ parentId: OTRO_PADRE_ID }), params(HIJA_ID));
    expect(res.status).toBe(200);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(OTRO_PADRE_ID);
  });

  it("rechaza colgarla de sí misma", async () => {
    const res = await PATCH(req({ parentId: HIJA_ID }), params(HIJA_ID));
    expect(res.status).toBe(400);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(PADRE_ID);
  });

  it("rechaza un padre de otro proyecto", async () => {
    const res = await PATCH(req({ parentId: AJENA_ID }), params(HIJA_ID));
    expect(res.status).toBe(400);
    expect(db.tasks.find((t) => t.id === HIJA_ID)!.parentId).toBe(PADRE_ID);
  });

  it("rechaza un padre de otro sector cuando la tarea es suelta de sector (sin proyecto)", async () => {
    const res = await PATCH(req({ parentId: PADRE_OTRO_SECTOR_ID }), params(HIJA_SECTOR_ID));
    expect(res.status).toBe(400);
    expect(db.tasks.find((t) => t.id === HIJA_SECTOR_ID)!.parentId).toBe(PADRE_SECTOR_ID);
  });

  it("rechaza colgar una tarea de una subtarea (un solo nivel de anidado)", async () => {
    const res = await PATCH(req({ parentId: HIJA_ID }), params(PADRE_ID));
    expect(res.status).toBe(400);
  });

  it("rechaza mover una tarea que todavía tiene subtareas abiertas", async () => {
    const res = await PATCH(req({ parentId: OTRO_PADRE_ID }), params(PADRE_ID));
    expect(res.status).toBe(400);
    expect(db.tasks.find((t) => t.id === PADRE_ID)!.parentId).toBeNull();
  });
});

describe("PATCH /api/tasks/[id] con parentId — herencia de EXEC al colgar (ruling 2026-08-29, hallazgo Importante C)", () => {
  it("una tarea sin EXEC propio hereda los del padre al colgarla", async () => {
    db.tasks.find((t) => t.id === PADRE_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_C }];

    const res = await PATCH(req({ parentId: PADRE_ID }), params(TAREA_SUELTA_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.links).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "EXEC", sectorId: SECTOR_C })]),
    );
  });

  it("una tarea CON EXEC propio no lo pierde ni suma el del padre (se respeta el suyo)", async () => {
    db.tasks.find((t) => t.id === TAREA_SUELTA_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_A }];
    db.tasks.find((t) => t.id === PADRE_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_C }];

    const res = await PATCH(req({ parentId: PADRE_ID }), params(TAREA_SUELTA_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    const execSectorIds = body.links.filter((l: { type: string }) => l.type === "EXEC").map((l: { sectorId: string }) => l.sectorId);
    expect(execSectorIds).toEqual([SECTOR_A]);
    expect(execSectorIds).not.toContain(SECTOR_C);
  });

  it("promover a tarea independiente (parentId: null) no toca ningún link", async () => {
    db.tasks.find((t) => t.id === HIJA_ID)!.links = [{ type: "EXEC", sectorId: SECTOR_A }];

    const res = await PATCH(req({ parentId: null }), params(HIJA_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.links).toEqual([{ type: "EXEC", sectorId: SECTOR_A }]);
  });
});

function deleteReq() {
  return new Request("http://localhost/api/tasks/x", { method: "DELETE" });
}

describe("DELETE con subtareas", () => {
  it("borrar la última hija abierta sincroniza al padre", async () => {
    const res = await DELETE(deleteReq(), params(HIJA_ID));
    expect(res.status).toBe(200);
    expect(syncParentStatus).toHaveBeenCalledWith(PADRE_ID, "user-1");
  });

  it("informa cuántas subtareas se borran junto al padre", async () => {
    const res = await DELETE(deleteReq(), params(PADRE_ID));
    expect(await res.json()).toMatchObject({ deletedSubtasks: 1 });
  });
});
