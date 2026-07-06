/**
 * Matching tolerante de etiquetas inline contra nombres de entidades — función pura, sin I/O
 * (Principio II). Ver specs/004-edicion-tareas-navegacion/research.md R1.
 *
 * El parser de tags (parser.ts) no acepta espacios dentro de una etiqueta, así que
 * "/Tina - Remodelación de paneles" se parsea como "/Tina". Este módulo resuelve esa
 * etiqueta parcial contra el nombre completo de la entidad:
 * - Igualdad canónica: espacio ≡ guion, insensible a mayúsculas/acentos (normalizeTagName).
 * - Fallback de prefijo único: si no hay igualdad, se busca el único candidato cuyo nombre
 *   canónico empiece por la etiqueta; 0 o 2+ candidatos → ambiguo, no resuelve.
 */

import { normalizeTagName } from "./parser";

/** Caracteres permitidos dentro de una etiqueta (ver NAME_CHAR en parser.ts). */
const NOT_ALLOWED_IN_TAG = /[^\p{L}\p{N}_\-.]+/gu;

/**
 * Forma canónica para comparar: normaliza (minúsculas, sin acentos) y colapsa toda
 * secuencia de espacios y/o guiones en un único separador "-", recortando los bordes.
 * Así "Tina - Remodelación" y "tina-remodelacion" comparan igual.
 */
export function canonical(s: string): string {
  return normalizeTagName(s)
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Convierte un nombre visible en su forma etiquetable insertable en el texto: todo
 * carácter no permitido por el parser de tags se vuelve "-", colapsando repeticiones y
 * sin guiones al inicio/fin. Conserva mayúsculas y acentos originales (es texto visible).
 *
 * Ej.: "Obra Escuela Norte" → "Obra-Escuela-Norte"
 *      "Tina - Remodelación de paneles" → "Tina-Remodelación-de-paneles"
 */
export function toTagForm(name: string): string {
  return name
    .replace(NOT_ALLOWED_IN_TAG, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True si la etiqueta y el nombre son equivalentes en forma canónica (espacio ≡ guion). */
export function tagMatchesName(tag: string, name: string): boolean {
  return canonical(tag) === canonical(name);
}

/**
 * Resuelve una etiqueta contra una lista de items con nombre.
 * 1º intenta igualdad canónica exacta: si hay exactamente un candidato, lo devuelve
 *    (si hay 2+, es ambiguo → null).
 * 2º si no hubo igualdad, cae a prefijo único: candidatos cuyo nombre canónico sea igual
 *    a la etiqueta o empiece con "etiqueta-"; exactamente un candidato → lo devuelve,
 *    0 o 2+ → null (ambiguo o sin match).
 */
export function matchByTag<T>(
  tag: string,
  items: readonly T[],
  getName: (item: T) => string,
): T | null {
  const canonicalTag = canonical(tag);

  const exactMatches = items.filter((item) => canonical(getName(item)) === canonicalTag);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length >= 2) return null;

  // La igualdad exacta ya se descartó arriba (0 candidatos): acá solo resta el prefijo.
  const prefix = `${canonicalTag}-`;
  const prefixMatches = items.filter((item) => canonical(getName(item)).startsWith(prefix));
  if (prefixMatches.length === 1) return prefixMatches[0];

  return null;
}
