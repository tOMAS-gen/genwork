import { describe, it, expect, vi, beforeEach } from "vitest";

type S = {
  id: string;
  name: string;
  color: string;
  type: "IN_PROGRESS" | "FINAL";
  sortOrder: number;
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
};
type T = { id: string; statusId: string; sectorId: string | null; links: { sectorId: string }[] };

const state = vi.hoisted(() => ({ statuses: [] as unknown[], tasks: [] as unknown[], seq: 0 }));
const statuses = () => state.statuses as S[];
const tasks = () => state.tasks as T[];

const match = (s: S, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => (s as unknown as Record<string, unknown>)[k] === v);

vi.mock("@/lib/db/client", () => ({
  prisma: {
    taskStatus: {
      count: async ({ where }: { where: Record<string, unknown> }) => statuses().filter((s) => match(s, where)).length,
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        const inIds = (where.sectorId as { in?: string[] } | null)?.in;
        const rows = inIds
          ? statuses().filter((s) => s.sectorId !== null && inIds.includes(s.sectorId))
          : statuses().filter((s) => match(s, where));
        return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
      },
      createMany: async ({ data }: { data: Omit<S, "id" | "groupId" | "ownerId">[] }) => {
        for (const d of data) {
          statuses().push({ ...d, groupId: null, ownerId: null, id: `n${++state.seq}` });
        }
      },
      create: async ({ data }: { data: Omit<S, "id"> }) => {
        const row = { ...data, id: `n${++state.seq}` } as S;
        statuses().push(row);
        return row;
      },
    },
    task: {
      findMany: async ({ where }: { where: { statusId: { notIn: string[] } } }) =>
        tasks()
          .filter((t) => !where.statusId.notIn.includes(t.statusId))
          .map((t) => ({ ...t, status: statuses().find((s) => s.id === t.statusId) })),
      updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: { statusId: string } }) => {
        for (const t of tasks()) if (where.id.in.includes(t.id)) t.statusId = data.statusId;
      },
    },
  },
}));

import { createStatus, listApplicableSet } from "@/server/taskStatus";

const st = (over: Partial<S> & Pick<S, "id" | "name" | "type">): S => ({
  color: "#000000",
  sortOrder: 0,
  groupId: null,
  ownerId: null,
  sectorId: null,
  ...over,
});

beforeEach(() => {
  state.seq = 0;
  state.statuses = [
    st({ id: "g-pend", name: "Pendiente", type: "IN_PROGRESS", sortOrder: 0 }),
    st({ id: "g-hecha", name: "Hecha", type: "FINAL", sortOrder: 1 }),
    st({ id: "grp-pend", name: "Pendiente", type: "IN_PROGRESS", groupId: "grp1" }),
    st({ id: "grp-hecha", name: "Hecha", type: "FINAL", sortOrder: 1, groupId: "grp1" }),
  ];
  state.tasks = [
    { id: "t1", statusId: "grp-pend", sectorId: null, links: [{ sectorId: "s1" }] },
    { id: "t2", statusId: "grp-hecha", sectorId: null, links: [{ sectorId: "s1" }] },
  ];
});

describe("listApplicableSet — sector sin override", () => {
  it("muestra el conjunto general como heredado", async () => {
    const res = await listApplicableSet({ sectorId: "s1" });
    expect(res.inherited).toBe(true);
    expect(res.statuses.map((s) => s.name)).toEqual(["Pendiente", "Hecha"]);
  });
});

describe("createStatus — sector sin conjunto propio", () => {
  it("siembra el conjunto base, agrega el estado y repunta las tareas del sector", async () => {
    const created = await createStatus({ sectorId: "s1" }, { name: "En revisión", color: "#3b82f6", type: "IN_PROGRESS" });

    const own = statuses().filter((s) => s.sectorId === "s1");
    expect(own.map((s) => s.name)).toEqual(["Pendiente", "Hecha", "En revisión"]);
    expect(created.sectorId).toBe("s1");

    const ownId = (name: string) => own.find((s) => s.name === name)!.id;
    expect(tasks().find((t) => t.id === "t1")!.statusId).toBe(ownId("Pendiente"));
    expect(tasks().find((t) => t.id === "t2")!.statusId).toBe(ownId("Hecha"));
  });

  it("un alta rechazada (segundo FINAL) no deja el conjunto base sembrado", async () => {
    await expect(
      createStatus({ sectorId: "s1" }, { name: "Cerrada", color: "#22c55e", type: "FINAL" }),
    ).rejects.toThrow();
    expect(statuses().filter((s) => s.sectorId === "s1")).toEqual([]);
    expect(tasks().map((t) => t.statusId)).toEqual(["grp-pend", "grp-hecha"]);
  });

  it("no repunta tareas con otro sector EXEC que tiene override y manda sobre este", async () => {
    statuses().push(st({ id: "a-pend", name: "Pendiente", type: "IN_PROGRESS", sectorId: "a" }));
    statuses().push(st({ id: "a-hecha", name: "Hecha", type: "FINAL", sectorId: "a", sortOrder: 1 }));
    tasks().push({ id: "t3", statusId: "a-pend", sectorId: null, links: [{ sectorId: "s1" }, { sectorId: "a" }] });

    await createStatus({ sectorId: "s1" }, { name: "En revisión", color: "#3b82f6", type: "IN_PROGRESS" });

    expect(tasks().find((t) => t.id === "t3")!.statusId).toBe("a-pend");
  });
});
