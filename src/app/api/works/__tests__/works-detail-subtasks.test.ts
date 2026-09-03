import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 062-subtareas (Tarea 11): GET /api/works/[id] devuelve las hijas anidadas
 * bajo su padre (no sueltas a nivel raíz) y cada tarea trae `parentId`,
 * `parentText`, `subtasks`, `subtaskCount` y `subtaskDone`.
 *
 * Patrón de mocks: `@/lib/db/client` en memoria, siguiendo
 * src/app/api/works/__tests__/client-grants.test.ts (mismo directorio).
 * `@/server/tasks` se mockea para aislar el DTO de la resolución de estados
 * aplicables (ya cubierta por sus propios tests).
 */

const WORK_ID = "11111111-1111-4111-8111-111111111111";

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

function status(type: "IN_PROGRESS" | "FINAL") {
  return { type, id: `status-${type}`, name: type, color: "#000" };
}

const padre = {
  id: "padre",
  parentId: null,
  rawText: "Padre",
  displayText: "Padre",
  workId: WORK_ID,
  sectorId: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
  parent: null,
};

const hija = {
  id: "hija",
  parentId: "padre",
  rawText: "Hija",
  displayText: "Hija",
  workId: WORK_ID,
  sectorId: null,
  position: 0,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
  parent: { id: "padre", displayText: "Padre" },
};

const suelta = {
  id: "suelta",
  parentId: null,
  rawText: "Suelta",
  displayText: "Suelta",
  workId: WORK_ID,
  sectorId: null,
  position: 1,
  status: status("IN_PROGRESS"),
  links: [],
  labels: [],
  homeSector: null,
  work: { id: WORK_ID, name: "Proyecto" },
  parent: null,
};

const db = vi.hoisted(() => ({
  tasks: [] as unknown[],
}));

/**
 * El mock INSPECCIONA el `include.tasks` real que arma la ruta: solo filtra
 * `parentId: null` y anida `subtasks` si el código efectivamente los pidió.
 * Así el test cae en RED contra la implementación vieja (sin el filtro/include)
 * en vez de simular la anidación por su cuenta.
 */
vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(
        async ({
          where,
          include,
        }: {
          where: { id: string };
          include?: {
            tasks?: { where?: { parentId?: null }; include?: { subtasks?: unknown } };
          };
        }) => {
          if (where.id !== WORK_ID) return null;
          const tasksInclude = include?.tasks;
          const rootFilterApplied = tasksInclude?.where?.parentId === null;
          const wantsSubtasks = !!tasksInclude?.include?.subtasks;

          const all = db.tasks as { id: string; parentId: string | null }[];
          const rows = rootFilterApplied ? all.filter((t) => t.parentId === null) : all;
          const tasks = rows.map((t) => ({
            ...t,
            ...(wantsSubtasks ? { subtasks: all.filter((s) => s.parentId === t.id) } : {}),
          }));

          return {
            id: WORK_ID,
            name: "Proyecto",
            folderSeq: 1,
            groupId: null,
            ownerId: null,
            group: null,
            stage: null,
            doc: null,
            attachments: [],
            archive: null,
            labels: [],
            tasks,
          };
        },
      ),
    },
  },
}));

import { GET } from "@/app/api/works/[id]/route";

function req() {
  return new Request(`http://localhost/api/works/${WORK_ID}`, { method: "GET" });
}

describe("GET /api/works/[id] — subtareas anidadas (062-subtareas, Tarea 11)", () => {
  beforeEach(() => {
    db.tasks = [padre, hija, suelta];
  });

  it("las hijas viajan anidadas bajo su padre, no sueltas a nivel raíz", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: WORK_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    const ids = body.tasks.map((t: { id: string }) => t.id);
    expect(ids).toEqual(["padre", "suelta"]); // "hija" NO aparece en la raíz
    expect(ids).not.toContain("hija");
  });

  it("el padre trae subtaskCount/subtaskDone y sus hijas serializadas con el mismo DTO", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: WORK_ID }) });
    const body = await res.json();
    const padreDto = body.tasks.find((t: { id: string }) => t.id === "padre");

    expect(padreDto.subtaskCount).toBe(1);
    expect(padreDto.subtaskDone).toBe(0);
    expect(padreDto.parentId).toBeNull();
    expect(padreDto.parentText).toBeNull();
    expect(padreDto.subtasks).toHaveLength(1);

    const hijaDto = padreDto.subtasks[0];
    expect(hijaDto.id).toBe("hija");
    expect(hijaDto.parentId).toBe("padre");
    expect(hijaDto.parentText).toBe("Padre");
    // Misma forma que cualquier tarea del listado (TaskItem la renderiza igual).
    expect(hijaDto.subtasks).toEqual([]);
    expect(hijaDto.subtaskCount).toBe(0);
    expect(hijaDto).toHaveProperty("statusOptions");
    expect(hijaDto).toHaveProperty("labels");
  });

  it("una tarea suelta sin hijas trae subtaskCount 0 y subtasks vacío", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: WORK_ID }) });
    const body = await res.json();
    const sueltaDto = body.tasks.find((t: { id: string }) => t.id === "suelta");
    expect(sueltaDto.subtaskCount).toBe(0);
    expect(sueltaDto.subtasks).toEqual([]);
    expect(sueltaDto.parentId).toBeNull();
    expect(sueltaDto.parentText).toBeNull();
  });

  it("menor de revisión: una hija FINAL hace que subtaskDone del padre sea > 0", async () => {
    db.tasks = [padre, { ...hija, status: status("FINAL") }, suelta];

    const res = await GET(req(), { params: Promise.resolve({ id: WORK_ID }) });
    const body = await res.json();
    const padreDto = body.tasks.find((t: { id: string }) => t.id === "padre");

    expect(padreDto.subtaskCount).toBe(1);
    expect(padreDto.subtaskDone).toBe(1);
    expect(padreDto.subtasks[0].status.type).toBe("FINAL");
  });
});
