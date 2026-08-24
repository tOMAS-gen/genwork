/**
 * Agrupación y orden del catálogo de sectores por ámbito (feature 060).
 *
 * El listado de `/sectors` mostraba ~40 sectores en una grilla plana A-Z, donde
 * `Comercial`, `stock-spec` y `pal-arte` convivían sin jerarquía. Acá se agrupan
 * en secciones por ámbito: GLOBAL, un grupo por sub-marca, y PERSONAL.
 *
 * Helper puro: sin React y sin I/O, para poder testear el orden y los agregados
 * en el entorno `node` de vitest (constitución, Principio VI). Vive co-ubicado
 * con la vista siguiendo el precedente de
 * `src/components/tasks/groupReferencesBySource.ts` — es lógica de presentación,
 * no de dominio.
 */

import { compareNameEs, sumPending } from "@/lib/nav/drawerSort";
import type { SectorCardData } from "@/components/sectors/SectorCard";

export type SectorSortKey = "name" | "pending" | "tasks" | "progress";
export type SectorSectionKind = "GLOBAL" | "GROUP" | "PERSONAL";

export interface SectorSection {
  /** Identidad estable de la sección: `scope:global` | `scope:personal` | `group:<uuid>`. */
  key: string;
  kind: SectorSectionKind;
  /** Nombre del grupo, o "Global" / "Personal". */
  title: string;
  groupId: string | null;
  /** Sectores de la sección, ya ordenados según `sort`. */
  sectors: SectorCardData[];
  count: number;
  pending: number;
  total: number;
  done: number;
  /** done/total, o 0 cuando la sección no tiene tareas. */
  progress: number;
}

export const GLOBAL_SECTION_KEY = "scope:global";
export const PERSONAL_SECTION_KEY = "scope:personal";
export const groupSectionKey = (groupId: string) => `group:${groupId}`;

/**
 * Convierte un `key` de sección en un id de DOM seguro para `aria-controls`.
 * Los keys llevan ":" y UUIDs, que no son válidos en todos los selectores.
 */
export function sectionDomId(key: string): string {
  return `sectors-section-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/** Peso del ámbito en el orden canónico: GLOBAL primero, PERSONAL último. */
const KIND_RANK: Record<SectorSectionKind, number> = {
  GLOBAL: 0,
  GROUP: 1,
  PERSONAL: 2,
};

const progressOf = (done: number, total: number) => (total > 0 ? done / total : 0);

/**
 * Orden canónico: GLOBAL → grupos alfabéticamente (collator español) → PERSONAL.
 * Se usa como orden por defecto y como desempate de todos los demás criterios,
 * para que el resultado sea siempre determinístico.
 */
function compareCanonical(a: SectorSection, b: SectorSection): number {
  if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) {
    return KIND_RANK[a.kind] - KIND_RANK[b.kind];
  }
  return compareNameEs(a.title, b.title) || compareNameEs(a.key, b.key);
}

function compareSections(sort: SectorSortKey) {
  return (a: SectorSection, b: SectorSection): number => {
    if (sort === "pending" && a.pending !== b.pending) return b.pending - a.pending;
    if (sort === "tasks" && a.total !== b.total) return b.total - a.total;
    if (sort === "progress" && a.progress !== b.progress) return b.progress - a.progress;
    return compareCanonical(a, b);
  };
}

function compareSectors(sort: SectorSortKey) {
  return (a: SectorCardData, b: SectorCardData): number => {
    if (sort === "pending" && a.metrics.pending !== b.metrics.pending) {
      return b.metrics.pending - a.metrics.pending;
    }
    if (sort === "tasks" && a.metrics.total !== b.metrics.total) {
      return b.metrics.total - a.metrics.total;
    }
    if (sort === "progress") {
      const pa = progressOf(a.metrics.done, a.metrics.total);
      const pb = progressOf(b.metrics.done, b.metrics.total);
      if (pa !== pb) return pb - pa;
    }
    return compareNameEs(a.name, b.name);
  };
}

/**
 * Resuelve a qué sección pertenece un sector. Un `scope` de tipo GROUP sin
 * `groupId` es imposible según la API, pero el tipo lo permite: en ese caso cae
 * a GLOBAL en vez de romper.
 */
function sectionOf(sector: SectorCardData): {
  key: string;
  kind: SectorSectionKind;
  title: string;
  groupId: string | null;
} {
  const { scope } = sector;
  if (scope.type === "GROUP" && scope.groupId) {
    return {
      key: groupSectionKey(scope.groupId),
      kind: "GROUP",
      title: scope.groupName ?? "Sin grupo",
      groupId: scope.groupId,
    };
  }
  if (scope.type === "PERSONAL") {
    return { key: PERSONAL_SECTION_KEY, kind: "PERSONAL", title: "Personal", groupId: null };
  }
  return { key: GLOBAL_SECTION_KEY, kind: "GLOBAL", title: "Global", groupId: null };
}

/**
 * Agrupa los sectores por ámbito y ordena los dos niveles con el mismo criterio.
 *
 * Las secciones se generan a partir de los sectores presentes, así que un grupo
 * sin sectores visibles nunca produce una sección vacía. Filtrar la entrada
 * antes de llamar acá (p. ej. por texto de búsqueda) alcanza para que las
 * secciones sin coincidencias desaparezcan.
 *
 * No muta el array de entrada.
 */
export function groupSectorsByScope(
  sectors: readonly SectorCardData[],
  sort: SectorSortKey = "name",
): SectorSection[] {
  const sections = new Map<string, SectorSection>();

  for (const sector of sectors) {
    const meta = sectionOf(sector);
    let section = sections.get(meta.key);
    if (!section) {
      section = {
        ...meta,
        sectors: [],
        count: 0,
        pending: 0,
        total: 0,
        done: 0,
        progress: 0,
      };
      sections.set(meta.key, section);
    }
    section.sectors.push(sector);
  }

  const bySector = compareSectors(sort);
  for (const section of sections.values()) {
    section.sectors.sort(bySector);
    section.count = section.sectors.length;
    section.pending = sumPending(
      section.sectors.map((s) => ({ id: s.id, name: s.name, pendingCount: s.metrics.pending })),
    );
    section.total = section.sectors.reduce((acc, s) => acc + s.metrics.total, 0);
    section.done = section.sectors.reduce((acc, s) => acc + s.metrics.done, 0);
    section.progress = progressOf(section.done, section.total);
  }

  return [...sections.values()].sort(compareSections(sort));
}
