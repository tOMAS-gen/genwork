/**
 * Split de texto multilínea en tareas (FR-105): una tarea por línea no vacía.
 * Función pura, sin I/O — usada al pegar varias líneas en el bloc de notas.
 */
export function splitTaskLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
