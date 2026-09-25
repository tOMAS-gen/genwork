import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api";

/**
 * objetivos (fase 7, crítica B2): rama `objectiveId` de PATCH /api/tasks/[id]
 * ("Mover tarea de sección"), y que las ramas de siempre (`parentId`,
 * `description`, texto) sigan despachando igual.
 *
 * La ruta discrimina por la clave presente en el body (unión zod). Todo lo que
 * hay detrás se mockea: `setTaskObjective` (servicio de objetivos, con sus
 * propios tests), y de `@/server/tasks` el gate de permisos
 * (`getTaskOrThrow`/`toTaskRef`; `canToggle` corta en true para SUPERADMIN) y
 * los núcleos de las otras ramas.
 */

const TASK_ID = randomUUID();
const WORK_ID = randomUUID();
const OBJ_ID = randomUUID();
const PARENT_ID = randomUUID();

const session = vi.hoisted(() => ({ globalRole: "SUPERADMIN" as string }));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "U", globalRole: session.globalRole },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: session.globalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

vi.mock("@/server/events", () => ({ emit: vi.fn() }));

const task = {
  id: TASK_ID,
  parentId: null,
  workId: WORK_ID,
  sectorId: null,
  objectiveId: null,
  originType: "WORK",
  adoptedAt: null,
  links: [],
};

/** DTO de tarea que devuelven los núcleos (`TaskWithLinks`). */
const taskDto = (extra: Record<string, unknown> = {}) => ({
  ...task,
  links: [],
  work: { id: WORK_ID, name: "Proyecto" },
  homeSector: null,
  objective: null,
  ...extra,
});

vi.mock("@/server/tasks", () => ({
  getTaskOrThrow: vi.fn(async () => task),
  toTaskRef: vi.fn(async () => ({})),
  setTaskParent: vi.fn(),
  saveTask: vi.fn(),
  syncParentStatus: vi.fn(async () => {}),
}));

vi.mock("@/server/objectives", () => ({ setTaskObjective: vi.fn() }));

vi.mock("@/lib/db/client", () => ({
  prisma: { task: { update: vi.fn(async ({ data }: { data: object }) => ({ ...task, ...data })) } },
}));

const { PATCH } = await import("@/app/api/tasks/[id]/route");
const { setTaskObjective } = await import("@/server/objectives");
const tasks = await import("@/server/tasks");
const { prisma } = await import("@/lib/db/client");

function req(body: unknown) {
  return new Request(`http://localhost/api/tasks/${TASK_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ id: TASK_ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  session.globalRole = "SUPERADMIN";
});

describe("PATCH /api/tasks/[id] con objectiveId — mover de sección", () => {
  it("a un objetivo, con index: 200 con el DTO de la tarea y llama solo a setTaskObjective", async () => {
    const moved = taskDto({ objectiveId: OBJ_ID, objective: { id: OBJ_ID, title: "O", position: 0 } });
    vi.mocked(setTaskObjective).mockResolvedValueOnce(moved as never);

    const res = await PATCH(req({ objectiveId: OBJ_ID, index: 2 }), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(moved);
    expect(setTaskObjective).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), TASK_ID, OBJ_ID, {
      index: 2,
    });
    expect(tasks.setTaskParent).not.toHaveBeenCalled();
    expect(tasks.saveTask).not.toHaveBeenCalled();
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it("objectiveId null = tareas generales; sin index va al final (index undefined)", async () => {
    vi.mocked(setTaskObjective).mockResolvedValueOnce(taskDto() as never);

    const res = await PATCH(req({ objectiveId: null }), params);

    expect(res.status).toBe(200);
    expect(setTaskObjective).toHaveBeenCalledWith(expect.anything(), TASK_ID, null, { index: undefined });
  });

  it("la ruta no emite eventos por su cuenta (los emite el servicio)", async () => {
    const { emit } = await import("@/server/events");
    vi.mocked(setTaskObjective).mockResolvedValueOnce(taskDto() as never);
    await PATCH(req({ objectiveId: OBJ_ID }), params);
    expect(emit).not.toHaveBeenCalled();
  });

  it.each([
    ["objectiveId que no es uuid", { objectiveId: "nope" }],
    ["index negativo", { objectiveId: OBJ_ID, index: -1 }],
    ["index no entero", { objectiveId: OBJ_ID, index: 1.5 }],
  ])("400 %s, sin llamar al servicio", async (_caso, body) => {
    const res = await PATCH(req(body), params);
    expect(res.status).toBe(400);
    expect(setTaskObjective).not.toHaveBeenCalled();
  });

  it.each([
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [400, "SUBTASK_OBJECTIVE"],
    [400, "OBJECTIVE_WORK_MISMATCH"],
    [409, "WORK_ARCHIVED"],
  ])("propaga %i %s del servicio", async (status, code) => {
    vi.mocked(setTaskObjective).mockRejectedValueOnce(new ApiError(status, code, "x"));
    const res = await PATCH(req({ objectiveId: OBJ_ID }), params);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("READER: 403 por requireWriter", async () => {
    session.globalRole = "READER";
    const res = await PATCH(req({ objectiveId: OBJ_ID }), params);
    expect(res.status).toBe(403);
    expect(setTaskObjective).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/tasks/[id] — las otras ramas no cambian", () => {
  it("parentId sigue yendo a setTaskParent (y no a setTaskObjective)", async () => {
    vi.mocked(tasks.setTaskParent).mockResolvedValueOnce(taskDto({ parentId: PARENT_ID }) as never);

    const res = await PATCH(req({ parentId: PARENT_ID }), params);

    expect(res.status).toBe(200);
    expect(tasks.setTaskParent).toHaveBeenCalledWith(expect.anything(), task, PARENT_ID);
    expect(tasks.syncParentStatus).toHaveBeenCalledWith(PARENT_ID, "user-1");
    expect(setTaskObjective).not.toHaveBeenCalled();
  });

  it("parentId gana si el body trae las dos claves (primera opción de la unión)", async () => {
    vi.mocked(tasks.setTaskParent).mockResolvedValueOnce(taskDto() as never);
    const res = await PATCH(req({ parentId: null, objectiveId: OBJ_ID }), params);
    expect(res.status).toBe(200);
    expect(tasks.setTaskParent).toHaveBeenCalled();
    expect(setTaskObjective).not.toHaveBeenCalled();
  });

  it("description sigue actualizando con prisma", async () => {
    const res = await PATCH(req({ description: "nota" }), params);
    expect(res.status).toBe(200);
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TASK_ID }, data: { description: "nota" } }),
    );
    expect(setTaskObjective).not.toHaveBeenCalled();
  });

  it("rawText + editContext sigue yendo a saveTask", async () => {
    vi.mocked(tasks.saveTask).mockResolvedValueOnce(taskDto() as never);
    const res = await PATCH(req({ rawText: "Nueva", editContext: "work" }), params);
    expect(res.status).toBe(200);
    expect(tasks.saveTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rawText: "Nueva", taskId: TASK_ID, contextWorkId: WORK_ID }),
    );
    expect(setTaskObjective).not.toHaveBeenCalled();
  });

  it("un body sin ninguna clave conocida sigue siendo 400", async () => {
    const res = await PATCH(req({ foo: 1 }), params);
    expect(res.status).toBe(400);
  });
});
