import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * objetivos (higiene de plantillas, D15 / crítica I4): `resolveTask` deja de
 * ofrecer plantillas como destino de `/trabajo`. La única excepción es la
 * plantilla de CONTEXTO: editar dentro de ella una tarea cuyo texto la nombra
 * no puede dar 409.
 *
 * El mock de `work.findMany` EVALÚA el `where` (igualdad por campo + `OR`/`AND`)
 * contra un dataset en memoria, en vez de ignorarlo: así el test falla de
 * verdad contra la implementación vieja (`{ ...scopeWhere, status: "ACTIVE" }`,
 * que devolvía también las plantillas).
 */

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
}

type Where = Record<string, unknown>;

/** Evaluador mínimo de un `WorkWhereInput` plano: igualdad, `OR` y `AND`. */
function matchesWhere(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (value as Where[]).every((w) => matchesWhere(row, w));
    return row[key] === value;
  });
}

const SECTOR_ID = "sector-ventas";

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
}));

const findManyWorks = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === "sector-ventas"
          ? { id, name: "Ventas", groupId: null, ownerId: null }
          : null,
      ),
      findMany: vi.fn(async () => []),
    },
    work: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.works.find((w) => w.id === id) ?? null,
      ),
      findMany: findManyWorks,
    },
    user: { findMany: vi.fn(async () => []) },
    labelValue: { findMany: vi.fn(async () => []) },
  },
}));

import { resolveTask } from "@/server/tasks";
import { ApiError } from "@/server/api";

function ctxFor(id: string): UserContext {
  return {
    id,
    globalRole: "MEMBER",
    memberGroupIds: new Set(),
    adminGroupIds: new Set(),
    grantedSectorIds: new Set(),
    readerGroupIds: new Set(),
    clientWorkIds: new Set(),
  };
}

const ctx = ctxFor("user-1");

beforeEach(() => {
  vi.clearAllMocks();
  // Todo en el espacio personal de user-1: desde un sector, el ámbito de
  // `/trabajo` es el personal del usuario (sectores = catálogo global).
  db.works = [
    { id: "work-real", name: "Proyecto", groupId: null, ownerId: "user-1", status: "ACTIVE", isTemplate: false },
    { id: "tpl-a", name: "Plantilla", groupId: null, ownerId: "user-1", status: "ACTIVE", isTemplate: true },
    { id: "tpl-b", name: "PlantillaB", groupId: null, ownerId: "user-1", status: "ACTIVE", isTemplate: true },
  ];
  findManyWorks.mockImplementation(async ({ where }: { where: Where }) =>
    db.works.filter((w) => matchesWhere(w as unknown as Record<string, unknown>, where)),
  );
});

async function unresolvedOf(promise: Promise<unknown>) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(409);
  return ((err as ApiError).extra as { unresolvedTags: { symbol: string; name: string }[] })
    .unresolvedTags;
}

describe("resolveTask — `/trabajo` no direcciona a plantillas (objetivos, D15)", () => {
  it("`/Plantilla` escrito desde un sector (sin trabajo de contexto) da 409 unresolvedTags", async () => {
    const unresolved = await unresolvedOf(
      resolveTask(ctx, { rawText: "/Plantilla preparar informe", contextSectorId: SECTOR_ID }),
    );
    expect(unresolved).toEqual([{ symbol: "/", name: "Plantilla" }]);
  });

  it("`/Proyecto` (proyecto real) sigue resolviendo desde un sector", async () => {
    const resolved = await resolveTask(ctx, {
      rawText: "/Proyecto preparar informe",
      contextSectorId: SECTOR_ID,
    });
    expect(resolved.workId).toBe("work-real");
  });

  it("dentro de una plantilla, `/Plantilla` (ella misma) resuelve a sí misma", async () => {
    const resolved = await resolveTask(ctx, {
      rawText: "/Plantilla preparar informe",
      contextWorkId: "tpl-a",
    });
    expect(resolved.workId).toBe("tpl-a");
  });

  it("dentro de la plantilla A, `/PlantillaB` da 409 (no se muda de plantilla por texto)", async () => {
    const unresolved = await unresolvedOf(
      resolveTask(ctx, { rawText: "/PlantillaB preparar informe", contextWorkId: "tpl-a" }),
    );
    expect(unresolved).toEqual([{ symbol: "/", name: "PlantillaB" }]);
  });

  it("dentro de una plantilla, `/Proyecto` resuelve al proyecto real", async () => {
    const resolved = await resolveTask(ctx, {
      rawText: "/Proyecto preparar informe",
      contextWorkId: "tpl-a",
    });
    expect(resolved.workId).toBe("work-real");
  });

  it("la consulta de candidatos lleva el filtro sin plantillas (y la excepción solo con contexto)", async () => {
    await resolveTask(ctx, { rawText: "/Proyecto x", contextSectorId: SECTOR_ID });
    expect(findManyWorks).toHaveBeenLastCalledWith({
      where: { ownerId: "user-1", status: "ACTIVE", OR: [{ isTemplate: false }] },
    });

    await resolveTask(ctx, { rawText: "/Proyecto x", contextWorkId: "tpl-a" });
    expect(findManyWorks).toHaveBeenLastCalledWith({
      where: { ownerId: "user-1", status: "ACTIVE", OR: [{ isTemplate: false }, { id: "tpl-a" }] },
    });
  });

  it("un proyecto archivado sigue sin ser destino de `/` (el filtro de estado no cambió)", async () => {
    db.works.push({
      id: "work-archivado",
      name: "Viejo",
      groupId: null,
      ownerId: "user-1",
      status: "ARCHIVED",
      isTemplate: false,
    });
    const unresolved = await unresolvedOf(
      resolveTask(ctx, { rawText: "/Viejo x", contextSectorId: SECTOR_ID }),
    );
    expect(unresolved).toEqual([{ symbol: "/", name: "Viejo" }]);
  });
});
