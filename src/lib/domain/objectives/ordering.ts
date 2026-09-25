/**
 * objetivos: helpers puros de orden manual, compartidos por el reorder de
 * tareas por ámbito {workId, objectiveId}, el reorder de objetivos, "Mover
 * tarea de sección" y el Subir/Bajar del menú ⋮ del objetivo.
 */

/**
 * ¿`orderedIds` es EXACTAMENTE el conjunto actual? Mismo tamaño, sin
 * duplicados y mismos ids — la comparación que hacía `reorderTaskSet`
 * (`src/server/tasks.ts`) antes de renumerar. Si da false el llamador responde
 * 409 (`TASK_SET_CHANGED` / `OBJECTIVE_SET_CHANGED`) sin tocar nada: alguien
 * creó o borró un elemento mientras se arrastraba.
 */
export function sameIdSet(currentIds: readonly string[], orderedIds: readonly string[]): boolean {
  const orderedSet = new Set(orderedIds);
  return (
    orderedIds.length === currentIds.length &&
    orderedSet.size === orderedIds.length && // sin duplicados
    currentIds.every((id) => orderedSet.has(id))
  );
}

/**
 * Devuelve una lista nueva con `id` en la posición `index` del resultado.
 * - Si `id` ya estaba, se saca de su lugar primero (mover = insertar).
 * - Sin `index` (o no finito) va al final.
 * - Un `index` fuera de rango se recorta a [0, largo].
 * No muta `ids`.
 */
export function insertAt(ids: readonly string[], id: string, index?: number): string[] {
  const rest = ids.filter((x) => x !== id);
  const at =
    index === undefined || !Number.isFinite(index)
      ? rest.length
      : Math.min(Math.max(Math.trunc(index), 0), rest.length);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/**
 * Intercambia `id` con su vecino de arriba o de abajo. En los bordes, o si
 * `id` no está, devuelve una copia sin cambios. No muta `ids`.
 */
export function moveNeighbor(ids: readonly string[], id: string, dir: "up" | "down"): string[] {
  const out = [...ids];
  const from = out.indexOf(id);
  if (from === -1) return out;
  const to = dir === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= out.length) return out;
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}
