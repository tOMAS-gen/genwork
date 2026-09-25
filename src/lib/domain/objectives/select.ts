/**
 * objetivos: referencia mínima al objetivo de una tarea (chip "Proyecto ›
 * Objetivo", orden de la vista de sector, DTO de tareas).
 *
 * Módulo HOJA a propósito: no importa nada. `src/server/tasks.ts` lo usa en el
 * `const taskInclude` a nivel de módulo, y `src/server/taskDto.ts` importa
 * `@/server/tasks`; si esta constante viviera en `taskDto.ts` (o este archivo
 * importara algo de ese grafo), `works/[id]/route.ts` cargaría `taskDto` antes
 * que `tasks` y la evaluación de `taskInclude` daría `ReferenceError: Cannot
 * access before initialization` (import circular).
 */
export const OBJECTIVE_REF_SELECT = { select: { id: true, title: true, position: true } } as const;
