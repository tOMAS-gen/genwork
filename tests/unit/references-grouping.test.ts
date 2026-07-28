/**
 * T004 [Foundational] — Pure helper `groupReferencesBySource`.
 *
 * Validates grouping by project (work) first, then origin sector fallback,
 * alphabetical sorting, and missing-origin fallback labels.
 */

import { describe, expect, it } from "vitest";
import { groupReferencesBySource } from "@/components/tasks/groupReferencesBySource";
import type { TaskDto } from "@/components/tasks/TaskItem";

const GROUP_A = { id: "group-a", name: "Grupo A" };
const GROUP_B = { id: "group-b", name: "Grupo B" };

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-1",
    rawText: "Tarea",
    displayText: "Tarea",
    status: { id: "status-1", name: "Pendiente", color: "#000", type: "IN_PROGRESS" },
    statusOptions: [],
    workId: null,
    work: null,
    originType: "SECTOR",
    adoptedAt: null,
    homeSector: null,
    labels: [],
    links: [],
    description: null,
    ...overrides,
  };
}

describe("groupReferencesBySource", () => {
  it("agrupa por proyecto cuando la tarea tiene work", () => {
    const tasks: TaskDto[] = [
      makeTask({ id: "t1", workId: "w1", work: { id: "w1", name: "Proyecto Alfa", status: "ACTIVE", group: GROUP_A } }),
      makeTask({ id: "t2", workId: "w1", work: { id: "w1", name: "Proyecto Alfa", status: "ACTIVE", group: GROUP_A } }),
    ];

    const groups = groupReferencesBySource(tasks);

    expect(groups).toHaveLength(1);
    expect(groups[0].header.type).toBe("work");
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("usa homeSector como fallback cuando no hay proyecto", () => {
    const tasks: TaskDto[] = [
      makeTask({
        id: "t1",
        homeSector: { id: "s1", name: "Sector Origen", group: GROUP_B },
      }),
    ];

    const groups = groupReferencesBySource(tasks);

    expect(groups).toHaveLength(1);
    expect(groups[0].header.type).toBe("sector");
    if (groups[0].header.type === "sector") {
      expect(groups[0].header.sector.name).toBe("Sector Origen");
    }
  });

  it("prevalece el proyecto sobre el sector de origen si ambos existen", () => {
    const tasks: TaskDto[] = [
      makeTask({
        id: "t1",
        workId: "w1",
        work: { id: "w1", name: "Proyecto Alfa", status: "ACTIVE", group: GROUP_A },
        homeSector: { id: "s1", name: "Sector Origen", group: GROUP_B },
      }),
    ];

    const groups = groupReferencesBySource(tasks);

    expect(groups).toHaveLength(1);
    expect(groups[0].header.type).toBe("work");
  });

  it("ordena alfabéticamente por nombre de proyecto/sector", () => {
    const tasks: TaskDto[] = [
      makeTask({ id: "t1", workId: "w2", work: { id: "w2", name: "Proyecto Beta", status: "ACTIVE", group: GROUP_A } }),
      makeTask({ id: "t2", homeSector: { id: "s1", name: "Alfa Sector", group: GROUP_B } }),
      makeTask({ id: "t3", workId: "w1", work: { id: "w1", name: "Proyecto Alfa", status: "ACTIVE", group: GROUP_A } }),
    ];

    const groups = groupReferencesBySource(tasks);

    expect(groups.map((g) => g.sortName)).toEqual(["Alfa Sector", "Proyecto Alfa", "Proyecto Beta"]);
  });

  it("usa un label de fallback cuando no hay proyecto ni sector de origen", () => {
    const tasks: TaskDto[] = [makeTask({ id: "t1" })];

    const groups = groupReferencesBySource(tasks);

    expect(groups).toHaveLength(1);
    expect(groups[0].header.type).toBe("sector");
    if (groups[0].header.type === "sector") {
      expect(groups[0].header.sector.name).toBe("Sin sector");
    }
  });

  it("resuelta empates por key para orden estable", () => {
    const tasks: TaskDto[] = [
      makeTask({ id: "t1", homeSector: { id: "s2", name: "Mismo", group: GROUP_A } }),
      makeTask({ id: "t2", homeSector: { id: "s1", name: "Mismo", group: GROUP_A } }),
    ];

    const groups = groupReferencesBySource(tasks);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.key)).toEqual(["sector:s1", "sector:s2"]);
  });
});
