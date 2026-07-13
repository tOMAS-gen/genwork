/**
 * T027 [US4] — Bloqueo de acceso cruzado en `assertWorkAccess` (FR-005).
 *
 * Verifica que la autorización se resuelve ANTES de tocar el proveedor de
 * almacenamiento: si el usuario no tiene permiso sobre el Work, se lanza 403 y
 * la (hipotética) operación del proveedor jamás se invoca.
 *
 * Estrategia de mocking: se stubean solo los dos límites de I/O —
 * `getUserContext` (arma el UserContext) y `prisma.work.findUnique` (busca el
 * Work). El motor de permisos `access()` es puro y corre real, así el test
 * ejercita la lógica de decisión de verdad.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserContext, GlobalRole } from "@/lib/domain/permissions";
import { ApiError } from "@/server/api";

const findUnique = vi.fn();
const getUserContext = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: { work: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: (...args: unknown[]) => getUserContext(...args),
}));

// Importado después de registrar los mocks.
const { assertWorkAccess } = await import("@/lib/storage/access-check");

/** UserContext mínimo con overrides. */
function makeCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    globalRole: "MEMBER" as GlobalRole,
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    ...overrides,
  };
}

/** Work de grupo con overrides. */
function makeWork(overrides: Record<string, unknown> = {}) {
  return {
    id: "work-1",
    groupId: "group-1",
    ownerId: null,
    nextcloudFolderPath: "/genwork/Grupo/001-Test",
    folderSeq: 1,
    group: { publicRead: false },
    ...overrides,
  };
}

beforeEach(() => {
  findUnique.mockReset();
  getUserContext.mockReset();
});

describe("assertWorkAccess — bloqueo de acceso cruzado (FR-005)", () => {
  it("usuario CON acceso (miembro del grupo) → no lanza y devuelve nivel operate", async () => {
    getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set(["group-1"]) }));
    findUnique.mockResolvedValue(makeWork());

    const result = await assertWorkAccess("user-1", "work-1");

    expect(result.level).toBe("operate");
    expect(result.work.id).toBe("work-1");
  });

  it("usuario SIN acceso → lanza FORBIDDEN (403) y NUNCA invoca la operación del proveedor", async () => {
    // Usuario MEMBER sin membresía en el grupo del work → access() = "none".
    getUserContext.mockResolvedValue(makeCtx());
    findUnique.mockResolvedValue(makeWork());

    // Simula la siguiente llamada hipotética al proveedor de almacenamiento.
    const providerOp = vi.fn();

    const run = async () => {
      const res = await assertWorkAccess("user-1", "work-1", "operate");
      providerOp(res); // solo se alcanza si la autorización pasó
    };

    await expect(run()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(providerOp).not.toHaveBeenCalled();
  });

  it("Work inexistente → lanza NOT_FOUND (404) antes de tocar el proveedor", async () => {
    getUserContext.mockResolvedValue(makeCtx({ memberGroupIds: new Set(["group-1"]) }));
    findUnique.mockResolvedValue(null);

    const providerOp = vi.fn();
    const run = async () => {
      const res = await assertWorkAccess("user-1", "missing", "read");
      providerOp(res);
    };

    await expect(run()).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect(providerOp).not.toHaveBeenCalled();
  });

  it("acceso de solo-lectura pidiendo `operate` → 403 (lectura no basta para escribir)", async () => {
    // READER habilitado en el grupo → access() = "read", nunca "operate".
    getUserContext.mockResolvedValue(
      makeCtx({ globalRole: "READER", readerGroupIds: new Set(["group-1"]) }),
    );
    findUnique.mockResolvedValue(makeWork());

    const providerOp = vi.fn();
    const run = async () => {
      const res = await assertWorkAccess("user-1", "work-1", "operate");
      providerOp(res);
    };

    await expect(run()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(providerOp).not.toHaveBeenCalled();
  });

  it("acceso de solo-lectura pidiendo `read` (default) → permite y devuelve nivel read", async () => {
    getUserContext.mockResolvedValue(
      makeCtx({ globalRole: "READER", readerGroupIds: new Set(["group-1"]) }),
    );
    findUnique.mockResolvedValue(makeWork());

    const result = await assertWorkAccess("user-1", "work-1");

    expect(result.level).toBe("read");
  });

  it("los errores lanzados son ApiError tipados del contrato", async () => {
    getUserContext.mockResolvedValue(makeCtx());
    findUnique.mockResolvedValue(makeWork());

    await expect(assertWorkAccess("user-1", "work-1")).rejects.toBeInstanceOf(ApiError);
  });
});
