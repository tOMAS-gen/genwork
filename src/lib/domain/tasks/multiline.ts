/**
 * Split de texto multilínea en tareas (FR-105): una tarea por línea no vacía.
 * Función pura, sin I/O — usada al pegar varias líneas en el bloc de notas
 * (tareas y subtareas).
 *
 * Corta en todo salto de línea que puede traer el portapapeles: `\r\n`
 * (Windows), `\n`, `\r` solo (Word/Excel en macOS) y los separadores Unicode
 * U+2028/U+2029 (Pages, iOS). Con solo `\n` un pegado desde Word quedaba como
 * una única tarea.
 */
export function splitTaskLines(text: string): string[] {
  return text
    .split(/\r\n|[\n\r\u2028\u2029]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
