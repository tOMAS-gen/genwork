import type { Prisma } from "@prisma/client";

/**
 * objetivos (higiene de plantillas): filtros `where` de proyecto/plantilla en
 * un solo lugar. Hoy los mismos literales están repetidos en varias rutas, y
 * en algunas faltan (tareas de plantillas que aparecen en el tablero, en "Mis
 * referencias" o como destino de `/`).
 *
 * Solo `import type`: este módulo no carga el cliente de prisma y se puede
 * importar desde cualquier capa (incluso tests sin mock de la DB).
 *
 * Las constantes de proyecto usan `satisfies` (conservan el tipo literal,
 * p. ej. `status: "ACTIVE"`). Los filtros de tarea NO llevan `as const`: un
 * `OR` readonly no es asignable a `TaskWhereInput[]`.
 */

/** Proyecto real (no plantilla), en cualquier estado. */
export const NOT_TEMPLATE_WORK = { isTemplate: false } satisfies Prisma.WorkWhereInput;

/** Proyecto activo no plantilla: se lista, se asigna a clientes, se direcciona con `/`. */
export const ACTIVE_PROJECT_WORK = {
  status: "ACTIVE",
  isTemplate: false,
} satisfies Prisma.WorkWhereInput;

/** Plantilla activa (dashboard `?filter=templates`, selector de plantillas, MCP). */
export const ACTIVE_TEMPLATE_WORK = {
  status: "ACTIVE",
  isTemplate: true,
} satisfies Prisma.WorkWhereInput;

/**
 * Tarea de trabajo pendiente: de un proyecto activo no plantilla, o suelta
 * (sin proyecto). OJO: trae `OR`; si el `where` ya tiene otro `OR`, combinar
 * con `AND: [...]` en vez de esparcirlo (el spread pisaría uno de los dos).
 */
export const TASK_IN_ACTIVE_PROJECT_OR_LOOSE: Prisma.TaskWhereInput = {
  OR: [{ work: ACTIVE_PROJECT_WORK }, { workId: null }],
};

/**
 * Tarea que no vive en una plantilla: de un proyecto en cualquier estado, o
 * suelta. Misma advertencia sobre el `OR` que el filtro anterior.
 */
export const TASK_NOT_IN_TEMPLATE: Prisma.TaskWhereInput = {
  OR: [{ work: NOT_TEMPLATE_WORK }, { workId: null }],
};
