/**
 * objetivos: agrupa las tareas de un proyecto en "Tareas generales" + una
 * sección por objetivo. Función pura compartida por la página de proyecto,
 * el portal, el export y el MCP (una sola forma de agrupar).
 *
 * - Conserva el orden de entrada: el de las tareas dentro de cada sección y
 *   el de los objetivos (el llamador los pasa ya ordenados por `position`).
 * - Un objetivo sin tareas aparece igual, con `tasks: []`.
 * - Un `objectiveId` que no está en `objectives` cae en generales (defensivo:
 *   la tarea nunca desaparece de la vista).
 */

export interface ObjectiveSection<T, O> {
  objective: O;
  tasks: T[];
}

export interface GroupedTasks<T, O> {
  general: T[];
  sections: ObjectiveSection<T, O>[];
}

export function groupTasksByObjective<
  T extends { objectiveId?: string | null },
  O extends { id: string },
>(tasks: readonly T[], objectives: readonly O[]): GroupedTasks<T, O> {
  const sections: ObjectiveSection<T, O>[] = [];
  const byId = new Map<string, ObjectiveSection<T, O>>();
  for (const objective of objectives) {
    // Un id repetido no abre una segunda sección vacía: gana el primero.
    if (byId.has(objective.id)) continue;
    const section: ObjectiveSection<T, O> = { objective, tasks: [] };
    byId.set(objective.id, section);
    sections.push(section);
  }

  const general: T[] = [];
  for (const task of tasks) {
    const section = task.objectiveId ? byId.get(task.objectiveId) : undefined;
    if (section) section.tasks.push(task);
    else general.push(task);
  }

  return { general, sections };
}

/**
 * Vuelve a una lista plana: primero las generales y después cada objetivo en
 * orden. La usan el tablero del proyecto y las actualizaciones optimistas.
 */
export function flattenSections<T>(grouped: GroupedTasks<T, unknown>): T[] {
  return [...grouped.general, ...grouped.sections.flatMap((s) => s.tasks)];
}
