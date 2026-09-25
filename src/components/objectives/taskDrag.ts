import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { groupTasksByObjective, flattenSections } from "@/lib/domain/objectives/grouping";
import { insertAt } from "@/lib/domain/objectives/ordering";

/**
 * objetivos: reglas puras del arrastre de la lista del proyecto (un solo
 * `DndContext` con un `SortableContext` por sección). Sin React ni fetch, así
 * se testean con vitest en entorno node.
 *
 * Ids de destino que conviven en el mismo contexto:
 * - `<taskId>`: la fila ordenable (soltar entre filas reordena o mueve).
 * - `nest:<taskId>`: la zona de anidado de una fila (062-subtareas).
 * - `section:general` / `section:<objectiveId>`: encabezado de la sección.
 * - `section:<clave>:empty`: el lugar reservado de una sección sin tareas.
 */

const GENERAL_KEY = "general";
const SECTION_PREFIX = "section:";
const NEST_PREFIX = "nest:";

/** Id droppable de una sección (su encabezado) o de su hueco vacío. */
export function sectionDropId(objectiveId: string | null, variant?: "empty"): string {
  const key = objectiveId ?? GENERAL_KEY;
  return `${SECTION_PREFIX}${key}${variant === "empty" ? ":empty" : ""}`;
}

/**
 * Lee un id de sección. `undefined` si no es de sección; `null` = generales.
 * Los ids de objetivo son uuid, así que no chocan con la clave `general`.
 */
export function parseSectionDropId(id: string): string | null | undefined {
  const match = /^section:([^:]+)(?::empty)?$/.exec(id);
  if (!match) return undefined;
  return match[1] === GENERAL_KEY ? null : match[1];
}

export function isSectionDropId(id: string): boolean {
  return id.startsWith(SECTION_PREFIX);
}

/** Lo que ve `resolveTaskDrop` de cada sección: su objetivo y sus raíces en orden. */
export interface DropSection {
  objectiveId: string | null;
  taskIds: string[];
}

export type TaskDropIntent =
  | { kind: "none" }
  | { kind: "nest"; taskId: string; parentId: string }
  | { kind: "reorder"; objectiveId: string | null; orderedTaskIds: string[] }
  | {
      kind: "move";
      taskId: string;
      fromObjectiveId: string | null;
      toObjectiveId: string | null;
      index: number;
    };

const NONE: TaskDropIntent = { kind: "none" };

/**
 * Traduce un "soltar" de dnd-kit a una intención:
 * - Sin destino, o sobre la propia tarea → nada.
 * - `nest:<id>` → colgar la tarea de esa otra (el backend hace que herede su objetivo).
 * - Encabezado u hueco de OTRA sección → mover al final de esa sección; de la
 *   propia → nada.
 * - Fila de la MISMA sección → reordenar (`arrayMove`).
 * - Fila de OTRA sección → mover a esa posición (`after` = soltó en la mitad
 *   de abajo de la fila, va después).
 */
export function resolveTaskDrop(
  sections: readonly DropSection[],
  activeId: string,
  overId: string | null,
  opts: { after?: boolean } = {},
): TaskDropIntent {
  if (!overId || overId === activeId) return NONE;

  const from = sections.find((s) => s.taskIds.includes(activeId));
  if (!from) return NONE;

  if (overId.startsWith(NEST_PREFIX)) {
    const parentId = overId.slice(NEST_PREFIX.length);
    if (!parentId || parentId === activeId) return NONE;
    return { kind: "nest", taskId: activeId, parentId };
  }

  const sectionTarget = parseSectionDropId(overId);
  if (sectionTarget !== undefined) {
    if (sectionTarget === from.objectiveId) return NONE;
    const to = sections.find((s) => s.objectiveId === sectionTarget);
    if (!to) return NONE;
    return {
      kind: "move",
      taskId: activeId,
      fromObjectiveId: from.objectiveId,
      toObjectiveId: sectionTarget,
      index: to.taskIds.length,
    };
  }

  const to = sections.find((s) => s.taskIds.includes(overId));
  if (!to) return NONE;

  if (to.objectiveId === from.objectiveId) {
    const oldIndex = from.taskIds.indexOf(activeId);
    const newIndex = from.taskIds.indexOf(overId);
    return {
      kind: "reorder",
      objectiveId: from.objectiveId,
      orderedTaskIds: arrayMove([...from.taskIds], oldIndex, newIndex),
    };
  }

  const overIndex = to.taskIds.indexOf(overId);
  return {
    kind: "move",
    taskId: activeId,
    fromObjectiveId: from.objectiveId,
    toObjectiveId: to.objectiveId,
    index: overIndex + (opts.after ? 1 : 0),
  };
}

/** Forma mínima de una raíz para el optimismo (la de `TaskDto`). */
export interface DragTask {
  id: string;
  objectiveId?: string | null;
  objective?: { id: string; title: string; position?: number } | null;
  subtasks?: DragTask[];
}

/**
 * Aplica una intención sobre la lista plana de raíces (actualización
 * optimista). Devuelve la lista agrupada y aplanada: primero generales, después
 * cada objetivo en orden. `nest` y `none` no cambian nada: el anidado espera
 * la respuesta del servidor.
 *
 * Un `move` actualiza `objectiveId`/`objective` de la tarea Y de sus hijas
 * (las hijas siguen al padre, igual que en el backend).
 */
export function applyDragIntent<T extends DragTask>(
  tasks: readonly T[],
  intent: TaskDropIntent,
  objectives: readonly { id: string; title: string; position: number }[],
): T[] {
  if (intent.kind === "none" || intent.kind === "nest") return [...tasks];

  const grouped = groupTasksByObjective(tasks, objectives);
  const sectionOf = (objectiveId: string | null): T[] | undefined =>
    objectiveId === null
      ? grouped.general
      : grouped.sections.find((s) => s.objective.id === objectiveId)?.tasks;

  if (intent.kind === "reorder") {
    const list = sectionOf(intent.objectiveId);
    if (!list) return [...tasks];
    const byId = new Map(list.map((t) => [t.id, t]));
    const reordered = intent.orderedTaskIds.map((id) => byId.get(id)).filter((t): t is T => !!t);
    // Si faltara alguna (otra pestaña agregó una), se conserva al final.
    const rest = list.filter((t) => !intent.orderedTaskIds.includes(t.id));
    list.splice(0, list.length, ...reordered, ...rest);
    return flattenSections(grouped);
  }

  const source = sectionOf(intent.fromObjectiveId);
  const target = sectionOf(intent.toObjectiveId);
  if (!source || !target) return [...tasks];
  const moving = source.find((t) => t.id === intent.taskId);
  if (!moving) return [...tasks];

  const objective = intent.toObjectiveId
    ? objectives.find((o) => o.id === intent.toObjectiveId) ?? null
    : null;
  const ref = objective ? { id: objective.id, title: objective.title, position: objective.position } : null;
  const moved = {
    ...moving,
    objectiveId: intent.toObjectiveId,
    objective: ref,
    ...(moving.subtasks
      ? {
          subtasks: moving.subtasks.map((s) => ({ ...s, objectiveId: intent.toObjectiveId, objective: ref })),
        }
      : {}),
  } as T;

  source.splice(source.indexOf(moving), 1);
  const order = insertAt(
    target.map((t) => t.id),
    moved.id,
    intent.index,
  );
  const byId = new Map<string, T>(target.map((t) => [t.id, t]));
  byId.set(moved.id, moved);
  target.splice(0, target.length, ...order.map((id) => byId.get(id)!));
  return flattenSections(grouped);
}

/**
 * Detección de colisiones de la lista del proyecto.
 * - Con puntero: primero se mira si el puntero está DENTRO de un encabezado o
 *   de un hueco de sección (`pointerWithin`); si no, `closestCenter` sobre filas
 *   y zonas `nest:`, como antes de objetivos.
 * - Con teclado (sin coordenadas de puntero): `closestCenter` sobre todo, así
 *   también se llega a los encabezados.
 * Por eso un id de sección nunca envuelve filas: si lo hiciera, `pointerWithin`
 * ganaría siempre y ya no se podría reordenar.
 */
export const taskSectionCollision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCenter(args);
  const sectionContainers = args.droppableContainers.filter((c) => isSectionDropId(String(c.id)));
  const inSection = pointerWithin({ ...args, droppableContainers: sectionContainers });
  if (inSection.length > 0) return inSection;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !isSectionDropId(String(c.id))),
  });
};
