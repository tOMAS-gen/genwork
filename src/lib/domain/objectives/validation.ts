import { z } from "zod";

/**
 * objetivos: reglas de validación compartidas entre las rutas HTTP y las
 * herramientas MCP (una sola definición).
 *
 * Los topes son los mismos que `Work.name` y `Work.description` (ver
 * `createSchema` en `src/app/api/works/route.ts`): una plantilla se inserta
 * como UN objetivo (nombre → título, descripción → descripción) y guardar un
 * objetivo como plantilla hace el camino inverso, así que ambos lados tienen
 * que aceptar los mismos largos.
 *
 * La descripción admite 2000 caracteres (igual que la de una tarea): con 280 un
 * proyecto con el detalle del trabajo no se podía guardar y la UI solo decía
 * "Error al guardar la descripción".
 */
export const OBJECTIVE_TITLE_MAX = 120;
export const OBJECTIVE_DESCRIPTION_MAX = 2000;

export const objectiveTitleSchema = z
  .string()
  .trim()
  .min(1, "El objetivo necesita un título")
  .max(OBJECTIVE_TITLE_MAX);

/**
 * Descripción opcional: el consumidor decide si la acepta `null`/ausente. El
 * string vacío (o solo espacios) pasa la validación y se guarda como `null`
 * con el patrón `|| null`.
 */
export const objectiveDescriptionSchema = z
  .string()
  .trim()
  .max(OBJECTIVE_DESCRIPTION_MAX, `La descripción admite hasta ${OBJECTIVE_DESCRIPTION_MAX} caracteres`);

/**
 * Modos de "Eliminar objetivo": borrar sus tareas o pasarlas a las tareas
 * generales del proyecto. Obligatorio en `DELETE /api/objectives/[id]` y en
 * `objective.delete` del MCP; no hay modo por defecto.
 */
export const DELETE_OBJECTIVE_MODES = ["deleteTasks", "moveToGeneral"] as const;
export type DeleteObjectiveMode = (typeof DELETE_OBJECTIVE_MODES)[number];
