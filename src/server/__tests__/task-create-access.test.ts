import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/domain/permissions";

/**
 * QA10: el alta de tareas exige OPERAR el contexto. Antes `saveTask` solo
 * comprobaba que el proyecto/sector existiera, así que un MEMBER creaba tareas
 * en proyectos y sectores ajenos (y subtareas bajo tareas ajenas) con el id.
 * Los rechazos ocurren antes de resolver el texto: alcanza con mockear lecturas.
 */

const works: Record<string, { id: string; groupId: string | null; ownerId: string | null; status: string; group: { publicRead: boolean } | null }> = {
  privado: { id: "privado", groupId: "g-ajeno", ownerId: null, status: "ACTIVE", group: { publicRead: false } },
  publico: { id: "publico", groupId: "g-publico", ownerId: null, status: "ACTIVE", group: { publicRead: true } },
};
const sectors: Record<string, { id: string; groupId: string | null; ownerId: string | null; group: { publicRead: boolean } | null }> = {
  personalAjeno: { id: "personalAjeno", groupId: null, ownerId: "otra", group: null },
  grupoAjeno: { id: "grupoAjeno", groupId: "g-ajeno", ownerId: null, group: { publicRead: false } },
  grupoPublico: { id: "grupoPublico", groupId: "g-publico", ownerId: null, group: { publicRead: true } },
};

vi.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === "padre-ajeno"
          ? { id, parentId: null, workId: "privado", sectorId: null, objectiveId: null, links: [] }
          : null,
      ),
    },
    work: { findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => works[id] ?? null) },
    sector: { findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => sectors[id] ?? null) },
  },
}));
vi.mock("@/server/events", () => ({ emit: vi.fn() }));

const { saveTask } = await import("@/server/tasks");

const member: UserContext = {
  id: "yo",
  globalRole: "MEMBER",
  memberGroupIds: new Set(),
  adminGroupIds: new Set(),
  grantedSectorIds: new Set(),
  readerGroupIds: new Set(),
  clientWorkIds: new Set(),
};

describe("saveTask: alta en contexto sin permiso", () => {
  it.each([
    ["proyecto de grupo privado", { contextWorkId: "privado" }, 404],
    ["proyecto de grupo con lectura pública", { contextWorkId: "publico" }, 403],
    ["sector personal ajeno", { contextSectorId: "personalAjeno" }, 404],
    ["sector de grupo privado", { contextSectorId: "grupoAjeno" }, 404],
    ["sector de grupo con lectura pública", { contextSectorId: "grupoPublico" }, 403],
    ["subtarea bajo una tarea de proyecto ajeno", { parentId: "padre-ajeno" }, 404],
  ])("%s → %i", async (_caso, context, status) => {
    await expect(saveTask(member, { rawText: "Intrusa", ...context })).rejects.toMatchObject({ status });
  });

  it("un SectorGrant habilita crear en el sector ajeno (pasa el control de acceso)", async () => {
    const granted = { ...member, grantedSectorIds: new Set(["personalAjeno"]) };
    // Pasa el control y sigue a resolver el texto; acá el mock ya no alcanza,
    // así que basta con que el error no sea de permisos.
    await expect(saveTask(granted, { rawText: "Con permiso", contextSectorId: "personalAjeno" })).rejects.not.toMatchObject({
      status: expect.any(Number),
    });
  });
});
