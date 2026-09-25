import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * objetivos (higiene de plantillas, D15): el autocompletado de `/` deja de
 * sugerir plantillas. Es el mismo criterio que `resolveTask`: una plantilla no
 * es destino de `/`, así que sugerirla llevaba a una tarea que después daba 409.
 *
 * El mock de `work.findMany` EVALÚA el `where` contra el dataset (igualdad por
 * campo), así el test falla contra el filtro viejo (`status: "ACTIVE"` solo).
 */

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
}

const USER_ID = "user-1";
const GROUP_ID = randomUUID();

const db = vi.hoisted(() => ({ works: [] as FakeWork[] }));
const findManyWorks = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "user@test.local", name: "Usuario", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set<string>([GROUP_ID]),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
      findMany: findManyWorks,
    },
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => ({
        id,
        name: "Ventas",
        groupId: null,
        ownerId: null,
      })),
    },
  },
}));

const { GET } = await import("@/app/api/tags/suggest/route");

function suggest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/tags/suggest");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return GET(new Request(url), undefined as never);
}

async function namesOf(params: Record<string, string>): Promise<string[]> {
  const res = await suggest(params);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { name: string; type: string }[];
  return body.map((r) => r.name).sort();
}

const PERSONAL_TEMPLATE_ID = randomUUID();
const GROUP_WORK_ID = randomUUID();
const GROUP_TEMPLATE_ID = randomUUID();

beforeEach(() => {
  vi.clearAllMocks();
  db.works = [
    // Espacio personal de user-1
    { id: randomUUID(), name: "Proyecto Alfa", groupId: null, ownerId: USER_ID, status: "ACTIVE", isTemplate: false },
    { id: PERSONAL_TEMPLATE_ID, name: "Proyecto Plantilla", groupId: null, ownerId: USER_ID, status: "ACTIVE", isTemplate: true },
    { id: randomUUID(), name: "Proyecto Viejo", groupId: null, ownerId: USER_ID, status: "ARCHIVED", isTemplate: false },
    // Grupo del usuario
    { id: GROUP_WORK_ID, name: "Proyecto Grupo", groupId: GROUP_ID, ownerId: null, status: "ACTIVE", isTemplate: false },
    { id: GROUP_TEMPLATE_ID, name: "Proyecto Receta", groupId: GROUP_ID, ownerId: null, status: "ACTIVE", isTemplate: true },
  ];
  findManyWorks.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    db.works.filter((w) =>
      Object.entries(where).every(([k, v]) => (w as unknown as Record<string, unknown>)[k] === v),
    ),
  );
});

describe("GET /api/tags/suggest — `/` sin plantillas (objetivos, D15)", () => {
  it("sin contexto (ámbito personal): sugiere el proyecto activo, no la plantilla ni el archivado", async () => {
    expect(await namesOf({ symbol: "/", q: "proyecto" })).toEqual(["Proyecto Alfa"]);
  });

  it("desde un proyecto de grupo: sugiere proyectos del grupo, no sus plantillas", async () => {
    expect(await namesOf({ symbol: "/", q: "proyecto", contextWorkId: GROUP_WORK_ID })).toEqual([
      "Proyecto Grupo",
    ]);
  });

  it("escribiendo dentro de una plantilla tampoco se sugieren plantillas (ni ella misma)", async () => {
    expect(
      await namesOf({ symbol: "/", q: "proyecto", contextWorkId: GROUP_TEMPLATE_ID }),
    ).toEqual(["Proyecto Grupo"]);
    expect(
      await namesOf({ symbol: "/", q: "proyecto", contextWorkId: PERSONAL_TEMPLATE_ID }),
    ).toEqual(["Proyecto Alfa"]);
  });

  it("la consulta lleva `status: ACTIVE` e `isTemplate: false` sobre el ámbito", async () => {
    await suggest({ symbol: "/", q: "x", contextWorkId: GROUP_WORK_ID });
    expect(findManyWorks).toHaveBeenCalledWith({
      where: { groupId: GROUP_ID, status: "ACTIVE", isTemplate: false },
    });
  });
});
