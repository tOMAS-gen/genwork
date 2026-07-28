import { describe, it, expect } from "vitest";
import {
  isTaskUnfinished,
  countUnfinished,
  countUnfinishedByKey,
  type CountableTask,
} from "@/lib/domain/tasks/unfinishedCount";

// Helpers to make readable fixtures
const inProgress = (id: string): CountableTask => ({
  id,
  status: { type: "IN_PROGRESS" },
});
const done = (id: string): CountableTask => ({
  id,
  status: { type: "FINAL" },
});
const noStatus = (id: string): CountableTask => ({ id, status: null });

describe("isTaskUnfinished (feature 054)", () => {
  it("returns false for a task whose status.type is FINAL", () => {
    expect(isTaskUnfinished(done("t1"))).toBe(false);
  });

  it("returns true for a task whose status.type is IN_PROGRESS", () => {
    expect(isTaskUnfinished(inProgress("t1"))).toBe(true);
  });

  it("returns true for a task with null status (defensive)", () => {
    // Rationale: R-001 — negating FINAL is safer than requiring IN_PROGRESS
    expect(isTaskUnfinished(noStatus("t1"))).toBe(true);
  });
});

describe("countUnfinished (feature 054)", () => {
  it("returns 0 for an empty iterable", () => {
    expect(countUnfinished([])).toBe(0);
  });

  it("returns 0 when every task is FINAL", () => {
    expect(countUnfinished([done("a"), done("b"), done("c")])).toBe(0);
  });

  it("counts every non-FINAL task once", () => {
    expect(
      countUnfinished([inProgress("a"), done("b"), inProgress("c")]),
    ).toBe(2);
  });

  it("deduplicates by task.id even when the same task appears twice", () => {
    // Same task id repeated in the iterable (defensive against TaskLink duplicates)
    expect(
      countUnfinished([inProgress("a"), inProgress("a"), done("b")]),
    ).toBe(1);
  });

  it("counts a task with null status as unfinished (defensive)", () => {
    expect(countUnfinished([noStatus("a"), done("b")])).toBe(1);
  });

  it("works with a generator (iterable, not just arrays)", () => {
    function* gen(): IterableIterator<CountableTask> {
      yield inProgress("a");
      yield done("b");
      yield inProgress("c");
    }
    expect(countUnfinished(gen())).toBe(2);
  });
});

describe("countUnfinishedByKey (feature 054)", () => {
  it("returns empty object for empty input", () => {
    expect(countUnfinishedByKey<string>([])).toEqual({});
  });

  it("groups unfinished tasks by key", () => {
    const tasks = [
      { ...inProgress("a"), key: "S1" },
      { ...inProgress("b"), key: "S1" },
      { ...done("c"), key: "S1" }, // FINAL → does NOT count
      { ...inProgress("d"), key: "S2" },
    ];
    expect(countUnfinishedByKey(tasks)).toEqual({ S1: 2, S2: 1 });
  });

  it("excludes tasks whose key is null", () => {
    const tasks = [
      { ...inProgress("a"), key: null as string | null },
      { ...inProgress("b"), key: "S1" as string | null },
    ];
    expect(countUnfinishedByKey(tasks)).toEqual({ S1: 1 });
  });

  it("deduplicates within a key by task.id", () => {
    const tasks = [
      { ...inProgress("a"), key: "S1" },
      { ...inProgress("a"), key: "S1" }, // dup
      { ...inProgress("b"), key: "S1" },
    ];
    expect(countUnfinishedByKey(tasks)).toEqual({ S1: 2 });
  });

  it("a task can contribute to two different keys (one time each)", () => {
    // Represents a task linked via TaskLink to two sectors: it appears once per
    // (task, sector) pair in the iterable; countUnfinishedByKey counts per key.
    const tasks = [
      { ...inProgress("a"), key: "S1" },
      { ...inProgress("a"), key: "S2" },
    ];
    expect(countUnfinishedByKey(tasks)).toEqual({ S1: 1, S2: 1 });
  });
});
