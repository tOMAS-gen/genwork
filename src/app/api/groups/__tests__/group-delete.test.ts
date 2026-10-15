import { describe, expect, it, vi } from "vitest";

/**
 * QA10: borrar un grupo con tareas respondía 500. Las tareas usan los estados
 * propios del grupo (TaskStatus, onDelete: Restrict) y la cascada Group →
 * TaskStatus chocaba con Task_statusId_fkey. Ahora se borran antes las tareas
 * del grupo, en la misma transacción.
 */

const GROUP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "admin-1", email: "a@test.local", name: "Admin", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "admin-1",
    globalRole: "MEMBER",
    memberGroupIds: new Set([GROUP]),
    adminGroupIds: new Set([GROUP]),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

const calls = vi.hoisted(() => [] as string[]);
const db = vi.hoisted(() => ({
  deleteMany: vi.fn(async (args: unknown) => {
    calls.push("task.deleteMany");
    return { count: 3, args };
  }),
  deleteGroup: vi.fn(async () => {
    calls.push("group.delete");
    return {};
  }),
  transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    group: { findUnique: vi.fn(async () => ({ id: GROUP, ownerId: "admin-1" })), delete: db.deleteGroup },
    task: { deleteMany: db.deleteMany },
    $transaction: db.transaction,
  },
}));

const { DELETE } = await import("@/app/api/groups/[id]/route");

describe("DELETE /api/groups/[id]", () => {
  it("borra las tareas del grupo antes del grupo, en una transacción", async () => {
    const res = await DELETE(new Request(`http://localhost/api/groups/${GROUP}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: GROUP }),
    });
    expect(res.status).toBe(200);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(calls).toEqual(["task.deleteMany", "group.delete"]);
    expect(db.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ work: { groupId: GROUP } }, { homeSector: { groupId: GROUP } }] },
    });
  });
});
