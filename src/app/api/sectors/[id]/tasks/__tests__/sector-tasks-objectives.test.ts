import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * objetivos (vistas externas): GET /api/sectors/[id]/tasks.
 *
 * - Cada tarea viaja con `objective {id,title,position}` para el chip
 *   "Proyecto › Objetivo" de TaskItem (null si es general).
 * - Dentro del grupo de cada proyecto (`byWork[].tasks`) el orden es: primero
 *   las generales por `position`, después cada objetivo en su `position`, y
 *   dentro de cada uno por `position` de la tarea. `position` es densa por
 *   sección, así que ordenar solo por `position` intercalaría objetivos.
 * - La forma de la respuesta no cambia: un grupo por proyecto (el objetivo no
 *   parte el grupo) y `metrics` igual que antes.
 *
 * El mock solo devuelve `objective` si la ruta lo pidió en el include, y
 * devuelve las filas en orden "de base" (por `position` solamente, como el
 * `orderBy` real), así el test cae en RED contra la implementación vieja.
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

type ObjectiveRef = { id: string; title: string; position: number };

const OBJ_OBRA: ObjectiveRef = { id: "obj-obra", title: "Obra", position: 1 };
const OBJ_DISENO: ObjectiveRef = { id: "obj-diseno", title: "Diseño", position: 0 };

const WORK = { id: "work-1", name: "Casa Pérez", status: "ACTIVE", groupId: null, group: null };

function row(id: string, position: number, objective: ObjectiveRef | null, over: Record<string, unknown> = {}) {
  return {
    id,
    parentId: null,
    parent: null,
    workId: WORK.id,
    sectorId: null,
    position,
    rawText: id,
    displayText: id,
    status: { id: "s", name: "Pendiente", color: "#000", type: "IN_PROGRESS" as const },
    links: [],
    labels: [],
    work: WORK,
    homeSector: null,
    _count: { subtasks: 0 },
    objectiveId: objective?.id ?? null,
    objective,
    ...over,
  };
}

type Row = ReturnType<typeof row>;

const db = vi.hoisted(() => ({
  execLinkTasks: [] as Row[],
  calls: [] as { kind: string; where: unknown; include: unknown }[],
}));

/** Saca `objective` si la ruta no lo pidió en el include. */
function project(t: Row, include: { objective?: unknown } | undefined): Row {
  if (include?.objective) return t;
  const { objective: _omit, ...rest } = t;
  void _omit;
  return rest as Row;
}

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
    taskLink: {
      findMany: vi.fn(
        async ({
          where,
          include,
        }: {
          where: { type: "EXEC" | "REF" };
          include: { task: { include: { objective?: unknown } } };
        }) => {
          db.calls.push({ kind: `link-${where.type}`, where, include });
          if (where.type !== "EXEC") return [];
          // Orden de la base: solo por `position` (como `orderBy: task.position`).
          return [...db.execLinkTasks]
            .sort((a, b) => a.position - b.position)
            .map((t) => ({ task: project(t, include.task.include) }));
        },
      ),
    },
    task: {
      findMany: vi.fn(async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => {
        db.calls.push({ kind: "sectorId" in where ? "loose" : "children", where, include });
        return [];
      }),
    },
  },
}));

import { GET } from "@/app/api/sectors/[id]/tasks/route";

async function load() {
  const res = await GET(new Request(`http://localhost/api/sectors/${SECTOR_ID}/tasks`), {
    params: Promise.resolve({ id: SECTOR_ID }),
  });
  expect(res.status).toBe(200);
  return res.json();
}

describe("GET /api/sectors/[id]/tasks — objetivos", () => {
  beforeEach(() => {
    db.calls = [];
    // Posiciones repetidas entre secciones a propósito (densas por ámbito).
    db.execLinkTasks = [
      row("obra-0", 0, OBJ_OBRA),
      row("diseno-1", 1, OBJ_DISENO),
      row("general-1", 1, null),
      row("diseno-0", 0, OBJ_DISENO),
      row("general-0", 0, null),
      row("obra-1", 1, OBJ_OBRA),
    ];
  });

  it("cada tarea trae `objective {id,title,position}` (null si es general)", async () => {
    const body = await load();
    const tasks = body.byWork[0].tasks as { id: string; objective: ObjectiveRef | null }[];
    expect(tasks.find((t) => t.id === "diseno-0")?.objective).toEqual(OBJ_DISENO);
    expect(tasks.find((t) => t.id === "general-0")?.objective).toBeNull();
  });

  it("el include de las tres consultas pide el objetivo", async () => {
    await load();
    const exec = db.calls.find((c) => c.kind === "link-EXEC")!;
    const ref = db.calls.find((c) => c.kind === "link-REF")!;
    const loose = db.calls.find((c) => c.kind === "loose")!;
    const objectiveSelect = { select: { id: true, title: true, position: true } };
    expect((exec.include as { task: { include: { objective: unknown } } }).task.include.objective).toEqual(
      objectiveSelect,
    );
    expect((ref.include as { task: { include: { objective: unknown } } }).task.include.objective).toEqual(
      objectiveSelect,
    );
    expect((loose.include as { objective: unknown }).objective).toEqual(objectiveSelect);
  });

  it("ordena el grupo del proyecto: generales, después cada objetivo por su posición", async () => {
    const body = await load();
    expect(body.byWork).toHaveLength(1); // el objetivo no parte el grupo del proyecto
    expect(body.byWork[0].tasks.map((t: { id: string }) => t.id)).toEqual([
      "general-0",
      "general-1",
      "diseno-0",
      "diseno-1",
      "obra-0",
      "obra-1",
    ]);
  });

  it("dos objetivos con la misma posición no se intercalan (desempate por id)", async () => {
    const a = { id: "obj-a", title: "A", position: 0 };
    const b = { id: "obj-b", title: "B", position: 0 };
    db.execLinkTasks = [row("b-0", 0, b), row("a-0", 0, a), row("b-1", 1, b), row("a-1", 1, a)];
    const body = await load();
    expect(body.byWork[0].tasks.map((t: { id: string }) => t.id)).toEqual(["a-0", "a-1", "b-0", "b-1"]);
  });

  it("sin objetivos el orden es el de siempre (por position)", async () => {
    db.execLinkTasks = [row("t2", 2, null), row("t0", 0, null), row("t1", 1, null)];
    const body = await load();
    expect(body.byWork[0].tasks.map((t: { id: string }) => t.id)).toEqual(["t0", "t1", "t2"]);
  });

  it("las métricas no cambian por tener objetivos", async () => {
    const body = await load();
    expect(body.metrics).toEqual({ total: 6, done: 0 });
  });

  it("los where siguen con los filtros de plantilla (exec, ref y loose)", async () => {
    await load();
    const noTemplates = { OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }] };
    const exec = db.calls.find((c) => c.kind === "link-EXEC")!.where as { task: unknown };
    const ref = db.calls.find((c) => c.kind === "link-REF")!.where as { task: unknown };
    const loose = db.calls.find((c) => c.kind === "loose")!.where as { OR: unknown };
    expect(exec.task).toMatchObject(noTemplates);
    expect(ref.task).toMatchObject(noTemplates);
    expect(loose.OR).toEqual([{ work: { isTemplate: false } }, { workId: null }]);
  });
});
