/**
 * Pure helpers for the drawer's per-section ordering and total-count
 * aggregation (feature 054).
 *
 * The drawer orders each section (Proyectos / Sectores / Grupos) by number of
 * unfinished tasks (desc). Ties break alphabetically by name (Spanish, base
 * sensitivity so accents fold with their unaccented counterparts). See spec §
 * FR-009..FR-012 and research.md §R-006.
 */

export type SortableItem = {
  id: string;
  name: string;
  pendingCount: number;
};

const nameCompare = new Intl.Collator("es", {
  sensitivity: "base",
  usage: "sort",
}).compare;

/**
 * Returns a NEW array (does not mutate input) with items ordered by:
 *   1. pendingCount descending
 *   2. name ascending (Spanish, base sensitivity) on ties
 *   3. original order on full ties (stability preserved because [].sort() in
 *      modern JS is stable and we return early with 0 on equality).
 */
export function sortByPendingDesc<T extends SortableItem>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => {
    if (b.pendingCount !== a.pendingCount) {
      return b.pendingCount - a.pendingCount;
    }
    const byName = nameCompare(a.name, b.name);
    if (byName !== 0) return byName;
    return 0;
  });
}

/**
 * Sums `pendingCount` across all items in the array.
 * Used to render the number next to each drawer section title.
 */
export function sumPending(items: readonly SortableItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.pendingCount;
  }
  return total;
}
