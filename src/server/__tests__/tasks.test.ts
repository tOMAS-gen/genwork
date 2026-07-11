import { describe, it, expect, vi } from "vitest";

/**
 * resolveTask() depende de Prisma para buscar sectores/trabajos/usuarios/etiquetas.
 * Se mockea @/lib/db/client con un dataset en memoria: los sectores son catálogo
 * global (feature 044), así que #Ventas debe resolver siempre al mismo Sector sin
 * importar desde qué trabajo (ni grupo) se crea la tarea.
 */

interface FakeSector {
  id: string;
  name: string;
}

interface FakeWork {
  id: string;
  groupId: string | null;
  ownerId: string | null;
  status: string;
}

const sectors: FakeSector[] = [
  { id: "sector-ventas", name: "Ventas" },
  { id: "sector-soporte", name: "Soporte" },
];

const works: FakeWork[] = [
  { id: "work-grupo-1", groupId: "group-1", ownerId: null, status: "ACTIVE" },
  { id: "work-grupo-2", groupId: "group-2", ownerId: null, status: "ACTIVE" },
  { id: "work-personal", groupId: null, ownerId: "user-2", status: "ACTIVE" },
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

describe("resolveTask — #sector resuelve por catálogo global (feature 044)", () => {
  it("una tarea con #Ventas creada desde trabajos de grupos distintos resuelve al MISMO sector", async () => {
    const ctx = ctxFor("user-1");

    const desdeGrupo1 = await resolveTask(ctx, {
      rawText: "#Ventas hacer seguimiento comercial",
      contextWorkId: "work-grupo-1",
    });
    const desdeGrupo2 = await resolveTask(ctx, {
      rawText: "#Ventas hacer seguimiento comercial",
      contextWorkId: "work-grupo-2",
    });

    expect(desdeGrupo1.execSectorIds).toEqual(["sector-ventas"]);
    expect(desdeGrupo2.execSectorIds).toEqual(["sector-ventas"]);
    expect(desdeGrupo1.execSectorIds).toEqual(desdeGrupo2.execSectorIds);
  });

  it("también resuelve al mismo sector desde un trabajo sin grupo (ámbito personal)", async () => {
    const ctx = ctxFor("user-2");

    const desdeGrupo1 = await resolveTask(ctx, {
      rawText: "#Ventas coordinar con cliente",
      contextWorkId: "work-grupo-1",
    });
    const desdePersonal = await resolveTask(ctx, {
      rawText: "#Ventas coordinar con cliente",
      contextWorkId: "work-personal",
    });

    expect(desdePersonal.execSectorIds).toEqual(["sector-ventas"]);
    expect(desdePersonal.execSectorIds).toEqual(desdeGrupo1.execSectorIds);
  });
});
