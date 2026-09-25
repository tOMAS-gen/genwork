import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * objetivos (crítica B1/B3): contrato de GET /api/works/[id] con objetivos.
 *
 * - `tasks` sigue siendo la lista plana de TODAS las raíces, cada una con
 *   `objectiveId` y `objective {id,title,position}`.
 * - `objectives` trae solo metadatos `{id,title,description,position,
 *   sourceTemplateId}`, ordenados, y sale de la MISMA consulta
 *   `work.findUnique` que las tareas.
 * - En una plantilla, `objectives` es `[]`.
 *
 * Mismo patrón de mocks que works-detail-subtasks.test.ts: el mock de
 * `work.findUnique` inspecciona el `include` real que arma la ruta.
 */

const WORK_ID = "11111111-1111-4111-8111-111111111111";
const OBJ_A = "22222222-2222-4222-8222-222222222222";
const OBJ_B = "33333333-3333-4333-8333-333333333333";

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "MEMBER",
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

interface ObjRow {
  id: string;
  title: string;
  description: string | null;
  position: number;
  sourceTemplateId: string | null;
}

const objA: ObjRow = { id: OBJ_A, title: "Diseño", description: null, position: 0, sourceTemplateId: null };
const objB: ObjRow = { id: OBJ_B, title: "Obra", description: "Etapa 2", position: 1, sourceTemplateId: WORK_ID };

function root(id: string, position: number, objective: ObjRow | null) {
  return {
    id,
    parentId: null,
    rawText: id,
    displayText: id,
    workId: WORK_ID,
    sectorId: null,
    position,
    objectiveId: objective?.id ?? null,
    status: { type: "IN_PROGRESS", id: "s", name: "Pendiente", color: "#000" },
    links: [],
    labels: [],
    homeSector: null,
    work: { id: WORK_ID, name: "Proyecto" },
    parent: null,
    subtasks: [],
  };
}

type Include = {
  tasks?: { where?: { parentId?: null }; include?: { objective?: unknown } };
  objectives?: { orderBy?: unknown; select?: Record<string, boolean> };
};

const db = vi.hoisted(() => ({
  isTemplate: false,
  objectives: [] as { id: string; title: string; position: number }[],
  tasks: [] as { objectiveId: string | null }[],
  fullCalls: [] as unknown[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: Include }) => {
        if (where.id !== WORK_ID) return null;
        const base = {
          id: WORK_ID,
          name: "Proyecto",
          folderSeq: 1,
          groupId: null,
          ownerId: "user-1",
          status: "ACTIVE",
          isTemplate: db.isTemplate,
          group: null,
          stage: null,
        };
        // La consulta del gate (`requireWorkAccess`) no pide tareas.
        if (!include?.tasks) return base;
        db.fullCalls.push(include);
        const objectiveSelected = !!include.tasks.include?.objective;
        return {
          ...base,
          doc: null,
          attachments: [],
          archive: null,
          labels: [],
          tasks: db.tasks.map((t) => {
            const o = db.objectives.find((x) => x.id === t.objectiveId);
            return {
              ...t,
              ...(objectiveSelected ? { objective: o ? { id: o.id, title: o.title, position: o.position } : null } : {}),
            };
          }),
          ...(include.objectives ? { objectives: db.objectives } : {}),
        };
      }),
    },
  },
}));

import { GET } from "@/app/api/works/[id]/route";

const call = () =>
  GET(new Request(`http://localhost/api/works/${WORK_ID}`), { params: Promise.resolve({ id: WORK_ID }) });

beforeEach(() => {
  db.isTemplate = false;
  db.objectives = [objA, objB];
  db.tasks = [root("general", 0, null), root("en-a", 0, objA), root("en-b", 0, objB)];
  db.fullCalls = [];
});

describe("GET /api/works/[id] — objetivos (crítica B1)", () => {
  it("devuelve `objectives` con solo metadatos y en orden", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.objectives).toEqual([objA, objB]);
  });

  it("pide los objetivos en la MISMA consulta que las tareas, ordenados y con el select del contrato", async () => {
    await call();
    expect(db.fullCalls).toHaveLength(1);
    const include = db.fullCalls[0] as Include;
    expect(include.objectives?.orderBy).toEqual([{ position: "asc" }, { createdAt: "asc" }]);
    expect(include.objectives?.select).toEqual({
      id: true,
      title: true,
      description: true,
      position: true,
      sourceTemplateId: true,
    });
  });

  it("`tasks` sigue plana con TODAS las raíces, cada una con objectiveId y objective", async () => {
    const body = await (await call()).json();
    expect(body.tasks.map((t: { id: string }) => t.id)).toEqual(["general", "en-a", "en-b"]);

    const byId = Object.fromEntries(body.tasks.map((t: { id: string }) => [t.id, t]));
    expect(byId.general.objectiveId).toBeNull();
    expect(byId.general.objective).toBeNull();
    expect(byId["en-a"].objectiveId).toBe(OBJ_A);
    expect(byId["en-a"].objective).toEqual({ id: OBJ_A, title: "Diseño", position: 0 });
    expect(byId["en-b"].objective).toEqual({ id: OBJ_B, title: "Obra", position: 1 });
  });

  it("un proyecto sin objetivos devuelve objectives: []", async () => {
    db.objectives = [];
    db.tasks = [root("general", 0, null)];
    const body = await (await call()).json();
    expect(body.objectives).toEqual([]);
  });

  it("en una plantilla, objectives es [] aunque un dato roto tenga filas", async () => {
    db.isTemplate = true;
    const body = await (await call()).json();
    expect(body.isTemplate).toBe(true);
    expect(body.objectives).toEqual([]);
  });
});
