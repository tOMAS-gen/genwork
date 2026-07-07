/**
 * Búsqueda de usuarios candidatos para agregar como miembro — función pura, sin I/O.
 * El caller (endpoint) resuelve los candidatos y el set de ya-miembros vía Prisma.
 */

import { normalizeTagName } from "@/lib/domain/tags/parser";

const MAX_RESULTS = 8;

export interface UserCandidate {
  id: string;
  name: string;
  email: string;
}

export interface UserMatch {
  id: string;
  name: string;
  email: string;
}

/**
 * Filtra por nombre/email (insensible a mayúsculas/acentos, ver normalizeTagName) y
 * ordena por relevancia: coincidencia al inicio de nombre/email primero, luego alfabético
 * por nombre (Decisión 3, research.md). Excluye a quienes ya son miembro (Decisión 5).
 */
export function searchUserCandidates(
  candidates: readonly UserCandidate[],
  query: string,
  existingMemberIds: ReadonlySet<string>,
): UserMatch[] {
  const q = normalizeTagName(query);

  return candidates
    .filter((c) => !existingMemberIds.has(c.id))
    .filter((c) => normalizeTagName(c.name).includes(q) || normalizeTagName(c.email).includes(q))
    .sort((a, b) => {
      const aStarts = startsWithQuery(a, q);
      const bStarts = startsWithQuery(b, q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_RESULTS)
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));
}

function startsWithQuery(c: UserCandidate, q: string): boolean {
  return normalizeTagName(c.name).startsWith(q) || normalizeTagName(c.email).startsWith(q);
}
