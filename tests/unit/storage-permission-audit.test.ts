/**
 * T010 [US3] — `permissionAudit` (FR-008), data-model.md.
 *
 * `permissionAudit` todavía NO existe — la crea T011 en
 * `src/lib/storage/permissionAudit.ts`. Este test es test-first: hoy falla
 * porque el módulo no existe (import sin resolver), no por un error de este
 * archivo. Define el contrato exacto que T011 debe implementar:
 *
 * ```ts
 * export async function permissionAudit(
 *   groupId: string,
 *   storage: StorageProvider,
 *   storageGroupId: string,
 * ): Promise<string | null>
 * ```
 *
 * Comportamiento esperado:
 * - Trae los miembros "esperados" del grupo en genwork vía
 *   `prisma.groupMembership.findMany({ where: { groupId }, include: { user: { select: { nextcloudUserId: true } } } })`
 *   (necesita el `nextcloudUserId` del `User` relacionado, porque
 *   `GroupMembership.userId` es el id interno de genwork, no el id de
 *   Nextcloud — sin ese join no hay forma de comparar contra `storageUserId`).
 *   Memberships cuyo `user.nextcloudUserId` sea `null` (usuario aún sin
 *   aprovisionar en Nextcloud) se ignoran en la comparación.
 * - Trae los miembros reales en Nextcloud vía
 *   `storage.listGroupMembers({ storageGroupId })`.
 * - Compara ambos sets de ids de Nextcloud:
 *   - Si hay un `storageUserId` en Nextcloud que no corresponde a ningún
 *     `nextcloudUserId` esperado (miembro de más en Nextcloud), lo reporta.
 *   - Si falta en Nextcloud un `nextcloudUserId` que sí está en genwork
 *     (miembro de menos en Nextcloud), lo reporta.
 *   - Si ambos sets coinciden (sin importar el orden), devuelve `null`.
 * - El mensaje de diferencia (string) debe mencionar los ids concretos en
 *   conflicto, para que sea útil como `lastError` de un `ProvisioningJob`.
 *
 * Estrategia de mocking: se stubea el único límite de I/O de Prisma
 * (`prisma.groupMembership.findMany`, patrón de `tests/unit/storage-delete.test.ts`
 * / `tests/unit/storage-identity.test.ts`) y se pasa un `StorageProvider` fake
 * con solo `listGroupMembers` mockeado — el resto de la interfaz no se usa.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "@/lib/storage/provider";

const findMany = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    groupMembership: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

// Importado después de registrar el mock. Este import es el que hoy falla
// (módulo inexistente) — señal esperada de test-first.
const { permissionAudit } = await import("@/lib/storage/permissionAudit");

/** StorageProvider fake: solo `listGroupMembers` importa para este test. */
function fakeStorage(storageUserIds: string[]): StorageProvider {
  return {
    listGroupMembers: vi.fn(async () => storageUserIds.map((storageUserId) => ({ storageUserId }))),
  } as unknown as StorageProvider;
}

function membership(userId: string, nextcloudUserId: string | null) {
  return { userId, groupId: "group-1", role: "MEMBER", user: { nextcloudUserId } };
}

beforeEach(() => {
  findMany.mockReset();
});

describe("permissionAudit (FR-008)", () => {
  it("detecta miembros de más en Nextcloud (sobra un storageUserId que no está en genwork)", async () => {
    findMany.mockResolvedValue([membership("user-1", "nc-1")]);
    const storage = fakeStorage(["nc-1", "nc-extra"]);

    const result = await permissionAudit("group-1", storage, "storage-group-1");

    expect(result).not.toBeNull();
    expect(result).toMatch(/nc-extra/);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "group-1" } }),
    );
    expect(storage.listGroupMembers).toHaveBeenCalledWith({
      storageGroupId: "storage-group-1",
    });
  });

  it("detecta miembros de menos en Nextcloud (falta un nextcloudUserId que sí está en genwork)", async () => {
    findMany.mockResolvedValue([membership("user-1", "nc-1"), membership("user-2", "nc-2")]);
    const storage = fakeStorage(["nc-1"]);

    const result = await permissionAudit("group-1", storage, "storage-group-1");

    expect(result).not.toBeNull();
    expect(result).toMatch(/nc-2/);
  });

  it("sin diferencias (mismos ids, distinto orden) -> null", async () => {
    findMany.mockResolvedValue([membership("user-1", "nc-1"), membership("user-2", "nc-2")]);
    const storage = fakeStorage(["nc-2", "nc-1"]);

    const result = await permissionAudit("group-1", storage, "storage-group-1");

    expect(result).toBeNull();
  });

  it("ignora memberships de genwork sin nextcloudUserId (usuario aún sin aprovisionar)", async () => {
    findMany.mockResolvedValue([membership("user-1", "nc-1"), membership("user-2", null)]);
    const storage = fakeStorage(["nc-1"]);

    const result = await permissionAudit("group-1", storage, "storage-group-1");

    expect(result).toBeNull();
  });
});
