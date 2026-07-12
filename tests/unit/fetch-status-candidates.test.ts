import { describe, it, expect } from "vitest";
import { fetchStatusCandidates } from "@/server/tasks";
import type { TaskScopeRef } from "@/lib/domain/tasks/statusResolution";

/**
 * Mock in-memory de un cliente Prisma, cubriendo solo taskStatus.findMany
 * (patrón tomado de tests/unit/clone-template.test.ts). Filtra el array de
 * statuses en memoria usando la misma semántica OR-de-filtros que Prisma:
 * un status matchea un filtro si TODAS sus keys coinciden.
 */
type MockStatus = {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
};

function createMockDb(statuses: MockStatus[]) {
  const calls: { where: { OR: Record<string, unknown>[] } }[] = [];
  const db = {
    taskStatus: {
      async findMany({ where }: { where: { OR: Record<string, unknown>[] } }) {
        calls.push({ where });
        return statuses.filter((s) =>
          where.OR.some((cond) => Object.entries(cond).every(([k, v]) => (s as Record<string, unknown>)[k] === v)),
        );
      },
    },
  };
  return { db, calls };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asDb = (db: unknown) => db as any;

const GLOBAL_STATUS: MockStatus = {
  id: "glob-1",
  name: "Global",
  color: "#000000",
  type: "IN_PROGRESS",
  sortOrder: 0,
  groupId: null,
  ownerId: null,
  sectorId: null,
};

const GROUP_STATUS: MockStatus = {
  id: "group-1-status",
  name: "Grupo",
  color: "#111111",
  type: "IN_PROGRESS",
  sortOrder: 0,
  groupId: "group-1",
  ownerId: null,
  sectorId: null,
};

describe("fetchStatusCandidates — feature global scope (finding 1 del review final)", () => {
  it("scope sin sector y sin group/owner en el work: igual devuelve el conjunto global si existe", async () => {
    const { db } = createMockDb([GLOBAL_STATUS]);
    const scope: TaskScopeRef = { execSector: null, workScope: null };

    const result = await fetchStatusCandidates(scope, asDb(db));

    expect(result.map((s) => s.id)).toEqual(["glob-1"]);
  });

  it("scope con work sin groupId/ownerId (personal sin owner resuelto): igual devuelve el global", async () => {
    const { db } = createMockDb([GLOBAL_STATUS]);
    // workScope existe pero ninguno de sus campos aporta filtro (caso límite defensivo).
    const scope: TaskScopeRef = { execSector: null, workScope: { groupId: null, ownerId: null } };

    const result = await fetchStatusCandidates(scope, asDb(db));

    expect(result.map((s) => s.id)).toEqual(["glob-1"]);
  });

  it("el filtro por grupo sigue funcionando y el global viaja junto como candidato adicional", async () => {
    const { db, calls } = createMockDb([GROUP_STATUS, GLOBAL_STATUS]);
    const scope: TaskScopeRef = { execSector: null, workScope: { groupId: "group-1", ownerId: null } };

    const result = await fetchStatusCandidates(scope, asDb(db));

    // Ambos deben venir: resolveApplicableStatusSet necesita el global disponible como
    // fallback aunque en este caso puntual no lo termine usando (hay set propio de grupo).
    expect(result.map((s) => s.id).sort()).toEqual(["glob-1", "group-1-status"]);

    // La query debe incluir el filtro global explícito además del filtro de grupo.
    expect(calls[0].where.OR).toContainEqual({ groupId: null, ownerId: null, sectorId: null });
    expect(calls[0].where.OR).toContainEqual({ groupId: "group-1" });
  });

  it("no devuelve el global si no existe ninguno con groupId/ownerId/sectorId null", async () => {
    const { db } = createMockDb([GROUP_STATUS]);
    const scope: TaskScopeRef = { execSector: null, workScope: { groupId: "group-1", ownerId: null } };

    const result = await fetchStatusCandidates(scope, asDb(db));

    expect(result.map((s) => s.id)).toEqual(["group-1-status"]);
  });
});
