import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api";

/**
 * objetivos (fase 7, crítica B2): contrato HTTP de las rutas de objetivos.
 *
 * Las rutas son adaptadores finos: sesión + `getUserContext` + zod del body +
 * llamada al servicio + status del contrato. `@/server/objectives` se mockea
 * entero (su lógica tiene sus propios tests en src/server/__tests__); acá se
 * prueba qué recibe el servicio, qué status sale y que un body inválido corta
 * con 400 ANTES de llegar al servicio.
 */

const WORK_ID = randomUUID();
const OBJ_ID = randomUUID();
const OBJ_2 = randomUUID();
const TEMPLATE_ID = randomUUID();

const session = vi.hoisted(() => ({ globalRole: "MEMBER" as string }));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "U", globalRole: session.globalRole },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async (id: string) => ({
    id,
    globalRole: session.globalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const dto = (id: string, position = 0) => ({
  id,
  title: `Objetivo ${position}`,
  description: null,
  position,
  sourceTemplateId: null,
});

vi.mock("@/server/objectives", () => ({
  listObjectives: vi.fn(),
  listTemplates: vi.fn(),
  createObjective: vi.fn(),
  insertTemplateAsObjective: vi.fn(),
  reorderObjectives: vi.fn(),
  updateObjective: vi.fn(),
  deleteObjective: vi.fn(),
  saveObjectiveAsTemplate: vi.fn(),
}));

const objectives = await import("@/server/objectives");
const worksObjectives = await import("@/app/api/works/[id]/objectives/route");
const fromTemplate = await import("@/app/api/works/[id]/objectives/from-template/route");
const reorder = await import("@/app/api/works/[id]/objectives/reorder/route");
const objective = await import("@/app/api/objectives/[id]/route");
const saveAsTemplate = await import("@/app/api/objectives/[id]/save-as-template/route");
const templates = await import("@/app/api/templates/route");

function req(method: string, body?: unknown, url = "http://localhost/api/x") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  session.globalRole = "MEMBER";
});

describe("POST /api/works/[id]/objectives — crear a mano", () => {
  it("201 con el ObjectiveDto y pasa workId + body al servicio", async () => {
    vi.mocked(objectives.createObjective).mockResolvedValueOnce(dto(OBJ_ID));

    const res = await worksObjectives.POST(req("POST", { title: " Lanzamiento ", description: "x" }), params(WORK_ID));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(dto(OBJ_ID));
    expect(objectives.createObjective).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      WORK_ID,
      { title: "Lanzamiento", description: "x" },
    );
  });

  it("acepta description null", async () => {
    vi.mocked(objectives.createObjective).mockResolvedValueOnce(dto(OBJ_ID));
    const res = await worksObjectives.POST(req("POST", { title: "A", description: null }), params(WORK_ID));
    expect(res.status).toBe(201);
  });

  it.each([
    ["sin título", {}],
    ["título vacío", { title: "   " }],
    ["título demasiado largo", { title: "x".repeat(121) }],
    ["descripción demasiado larga", { title: "A", description: "x".repeat(281) }],
  ])("400 %s, sin llamar al servicio", async (_caso, body) => {
    const res = await worksObjectives.POST(req("POST", body), params(WORK_ID));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
    expect(objectives.createObjective).not.toHaveBeenCalled();
  });

  it("READER: 403 por requireWriter, sin llamar al servicio", async () => {
    session.globalRole = "READER";
    const res = await worksObjectives.POST(req("POST", { title: "A" }), params(WORK_ID));
    expect(res.status).toBe(403);
    expect(objectives.createObjective).not.toHaveBeenCalled();
  });

  it("propaga los errores del servicio (plantilla → 400 TEMPLATE_NO_OBJECTIVES, archivado → 409)", async () => {
    vi.mocked(objectives.createObjective).mockRejectedValueOnce(
      new ApiError(400, "TEMPLATE_NO_OBJECTIVES", "Las plantillas no tienen objetivos"),
    );
    let res = await worksObjectives.POST(req("POST", { title: "A" }), params(WORK_ID));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("TEMPLATE_NO_OBJECTIVES");

    vi.mocked(objectives.createObjective).mockRejectedValueOnce(
      new ApiError(409, "WORK_ARCHIVED", "El proyecto está archivado"),
    );
    res = await worksObjectives.POST(req("POST", { title: "A" }), params(WORK_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("WORK_ARCHIVED");
  });
});

describe("GET /api/works/[id]/objectives", () => {
  it("200 con objetivos y generalTaskCounts", async () => {
    const payload = {
      objectives: [{ ...dto(OBJ_ID), taskCounts: { done: 1, total: 2 } }],
      generalTaskCounts: { done: 0, total: 3 },
    };
    vi.mocked(objectives.listObjectives).mockResolvedValueOnce(payload);

    const res = await worksObjectives.GET(req("GET"), params(WORK_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(objectives.listObjectives).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), WORK_ID);
  });

  it("CLIENT: 403 (solo portal)", async () => {
    session.globalRole = "CLIENT";
    const res = await worksObjectives.GET(req("GET"), params(WORK_ID));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/works/[id]/objectives/from-template — insertar plantilla", () => {
  it("201 con {...dto, copiedTasks}", async () => {
    const result = { ...dto(OBJ_ID), sourceTemplateId: TEMPLATE_ID, copiedTasks: 4 };
    vi.mocked(objectives.insertTemplateAsObjective).mockResolvedValueOnce(result);

    const res = await fromTemplate.POST(req("POST", { templateId: TEMPLATE_ID, title: "Otro nombre" }), params(WORK_ID));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(result);
    expect(objectives.insertTemplateAsObjective).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), {
      workId: WORK_ID,
      templateId: TEMPLATE_ID,
      title: "Otro nombre",
    });
  });

  it("sin título: el servicio recibe title undefined (usa el nombre de la plantilla)", async () => {
    vi.mocked(objectives.insertTemplateAsObjective).mockResolvedValueOnce({ ...dto(OBJ_ID), copiedTasks: 0 });
    const res = await fromTemplate.POST(req("POST", { templateId: TEMPLATE_ID }), params(WORK_ID));
    expect(res.status).toBe(201);
    expect(vi.mocked(objectives.insertTemplateAsObjective).mock.calls[0][1].title).toBeUndefined();
  });

  it.each([
    ["sin templateId", { title: "A" }],
    ["templateId que no es uuid", { templateId: "nope" }],
  ])("400 %s (no crea un objetivo vacío en silencio)", async (_caso, body) => {
    const res = await fromTemplate.POST(req("POST", body), params(WORK_ID));
    expect(res.status).toBe(400);
    expect(objectives.insertTemplateAsObjective).not.toHaveBeenCalled();
    expect(objectives.createObjective).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/works/[id]/objectives/reorder", () => {
  it("200 con ObjectiveDto[] en el orden nuevo", async () => {
    const ordered = [dto(OBJ_2, 0), dto(OBJ_ID, 1)];
    vi.mocked(objectives.reorderObjectives).mockResolvedValueOnce(ordered);

    const res = await reorder.PATCH(req("PATCH", { orderedObjectiveIds: [OBJ_2, OBJ_ID] }), params(WORK_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ordered);
    expect(objectives.reorderObjectives).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), WORK_ID, [
      OBJ_2,
      OBJ_ID,
    ]);
  });

  it("409 OBJECTIVE_SET_CHANGED si el servicio detecta otro conjunto", async () => {
    vi.mocked(objectives.reorderObjectives).mockRejectedValueOnce(
      new ApiError(409, "OBJECTIVE_SET_CHANGED", "El conjunto de objetivos cambió"),
    );
    const res = await reorder.PATCH(req("PATCH", { orderedObjectiveIds: [OBJ_ID] }), params(WORK_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("OBJECTIVE_SET_CHANGED");
  });

  it.each([
    ["lista vacía", { orderedObjectiveIds: [] }],
    ["ids duplicados", { orderedObjectiveIds: [OBJ_ID, OBJ_ID] }],
    ["id que no es uuid", { orderedObjectiveIds: ["x"] }],
    ["sin la clave", {}],
  ])("400 %s", async (_caso, body) => {
    const res = await reorder.PATCH(req("PATCH", body), params(WORK_ID));
    expect(res.status).toBe(400);
    expect(objectives.reorderObjectives).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/objectives/[id] — editar", () => {
  it("200 con el ObjectiveDto editado", async () => {
    const updated = { ...dto(OBJ_ID), title: "Nuevo", description: "d" };
    vi.mocked(objectives.updateObjective).mockResolvedValueOnce(updated);

    const res = await objective.PATCH(req("PATCH", { title: "Nuevo", description: "d" }), params(OBJ_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(objectives.updateObjective).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), OBJ_ID, {
      title: "Nuevo",
      description: "d",
    });
  });

  it("solo descripción (null la borra)", async () => {
    vi.mocked(objectives.updateObjective).mockResolvedValueOnce(dto(OBJ_ID));
    const res = await objective.PATCH(req("PATCH", { description: null }), params(OBJ_ID));
    expect(res.status).toBe(200);
    expect(vi.mocked(objectives.updateObjective).mock.calls[0][2]).toEqual({ description: null });
  });

  it.each([
    ["body vacío", {}],
    ["título vacío", { title: "" }],
  ])("400 %s", async (_caso, body) => {
    const res = await objective.PATCH(req("PATCH", body), params(OBJ_ID));
    expect(res.status).toBe(400);
    expect(objectives.updateObjective).not.toHaveBeenCalled();
  });

  it("404 si el servicio no encuentra el objetivo (o no hay acceso)", async () => {
    vi.mocked(objectives.updateObjective).mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "Objetivo no encontrado"));
    const res = await objective.PATCH(req("PATCH", { title: "A" }), params(OBJ_ID));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/objectives/[id] — eliminar", () => {
  it.each([
    ["deleteTasks", { deletedTasks: 3, movedTasks: 0 }],
    ["moveToGeneral", { deletedTasks: 0, movedTasks: 3 }],
  ] as const)("200 con modo %s", async (mode, counts) => {
    vi.mocked(objectives.deleteObjective).mockResolvedValueOnce(counts);

    const res = await objective.DELETE(req("DELETE", { mode }), params(OBJ_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(counts);
    expect(objectives.deleteObjective).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), OBJ_ID, mode);
  });

  it("400 sin mode (no hay modo por defecto)", async () => {
    const res = await objective.DELETE(req("DELETE", {}), params(OBJ_ID));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
    expect(objectives.deleteObjective).not.toHaveBeenCalled();
  });

  it("400 sin body (no 500 por JSON inválido)", async () => {
    const res = await objective.DELETE(req("DELETE"), params(OBJ_ID));
    expect(res.status).toBe(400);
    expect(objectives.deleteObjective).not.toHaveBeenCalled();
  });

  it.each(["keepTasks", "withTasks"])("400 con los nombres descartados (%s)", async (mode) => {
    const res = await objective.DELETE(req("DELETE", { mode }), params(OBJ_ID));
    expect(res.status).toBe(400);
    expect(objectives.deleteObjective).not.toHaveBeenCalled();
  });

  it("READER: 403", async () => {
    session.globalRole = "READER";
    const res = await objective.DELETE(req("DELETE", { mode: "deleteTasks" }), params(OBJ_ID));
    expect(res.status).toBe(403);
    expect(objectives.deleteObjective).not.toHaveBeenCalled();
  });
});

describe("POST /api/objectives/[id]/save-as-template", () => {
  it("201 con {id, name, copiedTasks}", async () => {
    const result = { id: randomUUID(), name: "Lanzamiento (2)", copiedTasks: 5 };
    vi.mocked(objectives.saveObjectiveAsTemplate).mockResolvedValueOnce(result);

    const res = await saveAsTemplate.POST(req("POST", {}), params(OBJ_ID));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(result);
    expect(objectives.saveObjectiveAsTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), OBJ_ID);
  });

  it("también sin body", async () => {
    vi.mocked(objectives.saveObjectiveAsTemplate).mockResolvedValueOnce({ id: "t", name: "n", copiedTasks: 0 });
    const res = await saveAsTemplate.POST(req("POST"), params(OBJ_ID));
    expect(res.status).toBe(201);
  });

  it("409 si el servicio agota los reintentos de nombre", async () => {
    vi.mocked(objectives.saveObjectiveAsTemplate).mockRejectedValueOnce(new ApiError(409, "CONFLICT", "Ya existe"));
    const res = await saveAsTemplate.POST(req("POST", {}), params(OBJ_ID));
    expect(res.status).toBe(409);
  });
});

describe("GET /api/templates", () => {
  const summary = {
    id: TEMPLATE_ID,
    name: "Onboarding",
    description: null,
    groupId: null,
    groupName: null,
    copyableTaskCount: 7,
  };

  it("200 con TemplateSummaryDto[] (incluye copyableTaskCount)", async () => {
    vi.mocked(objectives.listTemplates).mockResolvedValueOnce([summary]);

    const res = await templates.GET(req("GET", undefined, "http://localhost/api/templates"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([summary]);
    expect(objectives.listTemplates).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), {
      groupId: undefined,
    });
  });

  it("?groupId= acota por grupo; un groupId inválido es 400", async () => {
    const groupId = randomUUID();
    vi.mocked(objectives.listTemplates).mockResolvedValueOnce([]);
    let res = await templates.GET(req("GET", undefined, `http://localhost/api/templates?groupId=${groupId}`));
    expect(res.status).toBe(200);
    expect(vi.mocked(objectives.listTemplates).mock.calls[0][1]).toEqual({ groupId });

    res = await templates.GET(req("GET", undefined, "http://localhost/api/templates?groupId=nope"));
    expect(res.status).toBe(400);
  });
});
