import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 059 (FR-007) — un cliente externo no recibe carpeta en la nube.
 *
 * Por construcción el job no llega a encolarse para un cliente (su fila se crea
 * desde el panel de administración, no desde el callback de ingreso), pero el job
 * es encolable desde cualquier lado y el chequeo tiene que estar donde se ejecuta.
 */

const db = vi.hoisted(() => ({
  users: [] as { id: string; globalRole: string }[],
}));

const provisionUser = vi.hoisted(() => vi.fn(async () => ({ storageUserId: "nc-1" })));
const userUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        db.users.find((u) => u.id === where.id) ?? null,
      ),
      update: userUpdate,
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: vi.fn(async () => ({ provisionUser })),
}));

beforeEach(() => {
  db.users = [];
  vi.clearAllMocks();
});

describe("job CREATE_USER", () => {
  it("no aprovisiona a un cliente externo", async () => {
    db.users.push({ id: "c-1", globalRole: "CLIENT" });
    const { runJob } = await import("@/lib/storage/queue");

    await runJob({
      kind: "CREATE_USER",
      userId: "c-1",
      email: "cliente@empresa.com",
      displayName: "Cliente",
    });

    expect(provisionUser).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("sí aprovisiona a un usuario interno", async () => {
    db.users.push({ id: "m-1", globalRole: "MEMBER" });
    const { runJob } = await import("@/lib/storage/queue");

    await runJob({
      kind: "CREATE_USER",
      userId: "m-1",
      email: "interno@empresa.com",
      displayName: "Interno",
    });

    expect(provisionUser).toHaveBeenCalledOnce();
    expect(userUpdate).toHaveBeenCalledOnce();
  });
});
