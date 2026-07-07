/**
 * Código de referencia legible de la carpeta de un proyecto (feature 035).
 *
 * Formato: `NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO`, todo en MAYÚSCULAS.
 * Las tres partes se unen con guiones (`-`); dentro de cada nombre los espacios
 * (y caracteres no permitidos) se reemplazan por guión bajo (`_`). El número es
 * el `folderSeq` del proyecto, sin ceros a la izquierda. Proyecto sin grupo →
 * ámbito `PERSONAL`.
 *
 * Ejemplo: grupo "Farmacia Central", seq 23, proyecto "Mueble Living" →
 *   `FARMACIA_CENTRAL-23-MUEBLE_LIVING`
 *
 * Funciones puras, sin I/O. Es la única fuente de verdad del formato: se usa
 * tanto para mostrar el código en la UI como para nombrar la carpeta al crearla.
 */

/** Ámbito por defecto para proyectos sin grupo (espacio personal). */
const PERSONAL_SCOPE = "PERSONAL";

/**
 * Normaliza un segmento del código: MAYÚSCULAS, sin acentos, espacios y
 * caracteres fuera de `[A-Z0-9_]` convertidos a `_`, sin `_` repetidos ni en los
 * extremos. Determinista: el mismo texto produce siempre el mismo resultado.
 */
export function normalizeSegment(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita marcas de acento (diacríticos combinantes)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_") // cualquier no-alfanumérico (incluye espacios y "-") → "_"
    .replace(/_+/g, "_") // colapsa "_" repetidos
    .replace(/^_+|_+$/g, ""); // sin "_" al inicio/fin
}

/**
 * Arma el código de referencia del proyecto a partir del nombre del grupo (o
 * `null`/`undefined` para personal), el número secuencial de carpeta y el nombre
 * del proyecto.
 */
export function buildProjectCode(
  groupName: string | null | undefined,
  folderSeq: number,
  workName: string,
): string {
  const group = normalizeSegment(groupName ?? PERSONAL_SCOPE) || PERSONAL_SCOPE;
  const project = normalizeSegment(workName);
  return `${group}-${folderSeq}-${project}`;
}
