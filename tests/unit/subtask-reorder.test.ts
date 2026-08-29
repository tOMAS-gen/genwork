import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ tasks: [] as { id: string; parentId: string; position: number }[] }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: {
          findMany: vi.fn(async ({ where }: { where: { parentId: string } }) =>
            db.tasks.filter((t) => t.parentId === where.parentId).map((t) => ({ id: t.id })),
          ),
          update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: { position: number } }) => {
            db.tasks.find((t) => t.id === id)!.position = data.position;
          }),
        },
      }),
    ),
  },
}));

const { reorderSubtasks } = await import("@/server/tasks");

beforeEach(() => {
  db.tasks = [
    { id: "a", parentId: "padre", position: 0 },
    { id: "b", parentId: "padre", position: 1 },
    { id: "c", parentId: "padre", position: 2 },
  ];
});

describe("reorderSubtasks", () => {
  it("renumera las hijas en el orden recibido", async () => {
    await reorderSubtasks("padre", ["c", "a", "b"]);
    expect(db.tasks.map((t) => [t.id, t.position])).toEqual([["a", 1], ["b", 2], ["c", 0]]);
  });

  it("rechaza una lista que no coincide con las hijas actuales", async () => {
    await expect(reorderSubtasks("padre", ["a", "b"])).rejects.toMatchObject({
      code: "TASK_SET_CHANGED",
    });
  });
});
