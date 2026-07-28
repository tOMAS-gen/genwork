/**
 * Pure functions to derive "unfinished tasks" counts.
 *
 * A task is "unfinished" when its status.type is NOT "FINAL" (spec 042 FR-017).
 * A task with a null status is treated as unfinished defensively (see R-001
 * in specs/054-contadores-tareas-pendientes-drawer/research.md).
 *
 * These functions are pure and side-effect free so they can be unit-tested in
 * isolation (Constitution principle VI: Test-Backed Changes).
 */

/**
 * Minimal shape a task must have for these functions to operate on it.
 * The `status` field mirrors Prisma's TaskStatus relation projected to just
 * the `type` field: `{ id, type: "FINAL" | "IN_PROGRESS" } | null`.
 */
export type CountableTask = {
  id: string;
  status: { type: "FINAL" | "IN_PROGRESS" } | null;
};

/**
 * Returns true if the task is NOT in a FINAL status.
 * Null status counts as unfinished (defensive).
 */
export function isTaskUnfinished(task: CountableTask): boolean {
  return task.status?.type !== "FINAL";
}

/**
 * Counts unfinished tasks in the given iterable, deduplicated by `task.id`.
 * The same task id appearing multiple times only counts once.
 */
export function countUnfinished(tasks: Iterable<CountableTask>): number {
  const seen = new Set<string>();
  for (const t of tasks) {
    if (!isTaskUnfinished(t)) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
  }
  return seen.size;
}

/**
 * Groups unfinished tasks by a caller-provided key and returns a record of
 * counts. Tasks whose `key` is null are excluded.
 *
 * Deduplication is scoped by (key, task.id): the same task id can contribute
 * to two different keys (one time each), but never twice to the same key.
 * This matches the "task linked to two sectors via TaskLink EXEC" scenario.
 */
export function countUnfinishedByKey<K extends string>(
  tasks: Iterable<CountableTask & { key: K | null }>,
): Record<K, number> {
  const perKey: Record<string, Set<string>> = {};
  for (const t of tasks) {
    if (t.key == null) continue;
    if (!isTaskUnfinished(t)) continue;
    const bucket = (perKey[t.key] ??= new Set<string>());
    bucket.add(t.id);
  }
  const out = {} as Record<K, number>;
  for (const [k, ids] of Object.entries(perKey)) {
    out[k as K] = ids.size;
  }
  return out;
}
