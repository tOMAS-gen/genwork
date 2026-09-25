"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * objetivos: secciones de objetivo plegadas, recordadas por proyecto en
 * localStorage. Mismo patrón que `SectorsView` (feature 060): se guarda el
 * conjunto de secciones CERRADAS, así un objetivo nuevo (o la primera visita)
 * no figura y arranca abierto.
 *
 * Crítica I10: `serializeCollapsed` poda los ids que ya no existen. Si se
 * escribiera antes de la primera carga (con la lista de objetivos todavía
 * vacía) se borraría el estado guardado; por eso `persistCollapsed` no hace
 * nada hasta que el llamador avisa que ya cargó (`ready`).
 */

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function collapsedStorageKey(workId: string): string {
  return `gw:work-objectives-collapsed:${workId}`;
}

/** Lee el conjunto guardado. Tolera JSON roto, valores que no son arrays y storage inaccesible. */
export function readCollapsedIds(storage: ReadableStorage | null | undefined, key: string): string[] {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === "string");
  } catch {
    return [];
  }
}

/** Serializa solo los ids que todavía existen, para que la clave no crezca con objetivos borrados. */
export function serializeCollapsed(collapsed: ReadonlySet<string>, knownIds: readonly string[]): string {
  const known = new Set(knownIds);
  return JSON.stringify([...collapsed].filter((id) => known.has(id)));
}

/** Escribe el conjunto, pero solo después de la primera carga (`ready`). Devuelve si escribió. */
export function persistCollapsed(
  storage: WritableStorage | null | undefined,
  key: string,
  collapsed: ReadonlySet<string>,
  knownIds: readonly string[],
  ready: boolean,
): boolean {
  if (!ready || !storage) return false;
  try {
    storage.setItem(key, serializeCollapsed(collapsed, knownIds));
    return true;
  } catch {
    // Modo privado o storage lleno: el plegado sigue andando en memoria.
    return false;
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * @param objectiveIds ids de los objetivos del proyecto (para podar al guardar).
 * @param ready true una vez que el proyecto cargó; antes no se escribe nada.
 */
export function useCollapsedObjectives(workId: string, objectiveIds: readonly string[], ready: boolean) {
  const key = collapsedStorageKey(workId);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  // Se lee después del montaje (el render del servidor no tiene localStorage).
  useEffect(() => {
    setCollapsed(new Set(readCollapsedIds(browserStorage(), key)));
  }, [key]);

  // Refs para que `toggle`/`expand` sean estables y escriban con los últimos datos.
  const knownRef = useRef(objectiveIds);
  const readyRef = useRef(ready);
  useEffect(() => {
    knownRef.current = objectiveIds;
    readyRef.current = ready;
  }, [objectiveIds, ready]);

  const update = useCallback(
    (fn: (prev: Set<string>) => Set<string>) => {
      setCollapsed((prev) => {
        const next = fn(prev);
        if (next === prev) return prev;
        persistCollapsed(browserStorage(), key, next, knownRef.current, readyRef.current);
        return next;
      });
    },
    [key],
  );

  const toggle = useCallback(
    (id: string) =>
      update((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [update],
  );

  const expand = useCallback(
    (id: string) =>
      update((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    [update],
  );

  const isOpen = useCallback((id: string) => !collapsed.has(id), [collapsed]);

  return { isOpen, toggle, expand };
}
