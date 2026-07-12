import { describe, it, expect, vi } from "vitest";

/**
 * resolveTask() depende de Prisma para buscar sectores/trabajos/usuarios/etiquetas.
 * Se mockea @/lib/db/client con un dataset en memoria: los sectores recuperan ámbito
 * propio (feature 046) — el mismo nombre puede repetirse en distintos ámbitos (Grupo,
 * Personal, Global) — y #sector/@sector resuelve por prioridad de ámbito (FR-008):
 * (1) Grupo del contexto/trabajo actual, (2) sector Personal del usuario, (3) Global.
 */

interface FakeSector {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
}

interface FakeWork {
  id: string;
  groupId: string | null;
  ownerId: string | null;
  status: string;
}

const sectors: FakeSector[] = [
  // Dos sectores "Ventas" en ámbitos distintos, ambos accesibles para user-1:
  // uno del Grupo 1, otro Personal de ese mismo usuario.
  { id: "sector-ventas-grupo1", name: "Ventas", groupId: "group-1", ownerId: null },
  { id: "sector-ventas-personal-user1", name: "Ventas", groupId: null, ownerId: "user-1" },
  { id: "sector-soporte-global", name: "Soporte", groupId: null, ownerId: null },
];

const works: FakeWork[] = [
  { id: "work-grupo-1", groupId: "group-1", ownerId: null, status: "ACTIVE" },
  { id: "work-personal-user1", groupId: null, ownerId: "user-1", status: "ACTIVE" },
];

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        sectors.find((s) => s.id === id) ?? null,
      ),
      findMany: vi.fn(async () => sectors),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        works.find((w) => w.id === id) ?? null,
      ),
      findMany: vi.fn(async () => []),
    },
    user: {
      findMany: vi.fn(async () => []),
    },
    labelValue: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import { resolveTask } from "@/server/tasks";
import type { UserContext } from "@/lib/domain/permissions";

function ctxFor(id: string): UserContext {
  return {
    id,
    globalRole: "MEMBER",
    memberGroupIds: new Set(["group-1", "group-2"]),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
  };
}

describe("resolveTask — #sector resuelve por prioridad de ámbito (feature 046)", () => {
  it("una tarea con #Ventas creada en un trabajo del Grupo 1 resuelve al sector Ventas de ESE grupo", async () => {
    const ctx = ctxFor("user-1");

    const resolved = await resolveTask(ctx, {
      rawText: "#Ventas hacer seguimiento comercial",
      contextWorkId: "work-grupo-1",
    });

    expect(resolved.execSectorIds).toEqual(["sector-ventas-grupo1"]);
  });

  it("una tarea con #Ventas creada en el espacio Personal del usuario resuelve al sector Ventas Personal de ese usuario", async () => {
    const ctx = ctxFor("user-1");

    const resolved = await resolveTask(ctx, {
      rawText: "#Ventas coordinar con cliente",
      contextWorkId: "work-personal-user1",
    });

    expect(resolved.execSectorIds).toEqual(["sector-ventas-personal-user1"]);
  });

  it("con ambos sectores 'Ventas' accesibles, el mismo usuario resuelve distinto según el ámbito de creación", async () => {
    const ctx = ctxFor("user-1");

    const desdeGrupo = await resolveTask(ctx, {
      rawText: "#Ventas hacer seguimiento comercial",
      contextWorkId: "work-grupo-1",
    });
    const desdePersonal = await resolveTask(ctx, {
      rawText: "#Ventas coordinar con cliente",
      contextWorkId: "work-personal-user1",
    });

    expect(desdeGrupo.execSectorIds).toEqual(["sector-ventas-grupo1"]);
    expect(desdePersonal.execSectorIds).toEqual(["sector-ventas-personal-user1"]);
    expect(desdeGrupo.execSectorIds).not.toEqual(desdePersonal.execSectorIds);
  });
});
