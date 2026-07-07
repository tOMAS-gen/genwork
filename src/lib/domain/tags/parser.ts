/**
 * Parser de etiquetas inline de genwork — función pura, sin I/O (Principio II).
 *
 * Sintaxis (FR-007):
 *   /nombre  → trabajo al que pertenece la tarea
 *   #nombre  → sector donde se ejecuta
 *   @nombre  → sector o usuario referenciado (necesita su aporte)
 *   $nombre  → etiqueta de valor (clave/valor) asignada a la tarea
 *
 * Reglas:
 * - Una etiqueta solo se reconoce si el símbolo está al inicio del texto o precedido
 *   por espacio, y seguido de letra/número. "perfil 20/20" NO etiqueta (edge case spec).
 * - Escape con símbolo doble: "//", "##", "@@", "$$" → símbolo literal simple.
 * - El matching con entidades es insensible a mayúsculas y acentos: usar normalizeTagName.
 */

export type TagSymbol = "/" | "#" | "@" | "$";

export interface ParsedTag {
  symbol: TagSymbol;
  /** Nombre tal como se escribió (sin el símbolo). */
  name: string;
  /** Offset del símbolo dentro de rawText. */
  start: number;
  /** Offset exclusivo del final de la etiqueta dentro de rawText. */
  end: number;
}

export interface ParseResult {
  /** Texto para mostrar: sin etiquetas, escapes resueltos, espacios colapsados. */
  displayText: string;
  tags: ParsedTag[];
}

const SYMBOLS: ReadonlySet<string> = new Set(["/", "#", "@", "$"]);
// Letras (con acentos), números, guion, guion bajo y punto interno.
const NAME_CHAR = /[\p{L}\p{N}_\-.]/u;

/** Normaliza para comparar: minúsculas y sin acentos. "Metalúrgica" ≡ "metalurgica". */
export function normalizeTagName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function parseTags(rawText: string): ParseResult {
  const tags: ParsedTag[] = [];
  let display = "";
  let i = 0;

  while (i < rawText.length) {
    const ch = rawText[i];

    if (SYMBOLS.has(ch)) {
      const prev = i === 0 ? " " : rawText[i - 1];
      const next = rawText[i + 1];

      // Escape: símbolo doble → literal simple
      if (next === ch) {
        display += ch;
        i += 2;
        continue;
      }

      const atBoundary = /\s/.test(prev);
      const startsName = next !== undefined && NAME_CHAR.test(next);

      if (atBoundary && startsName) {
        let j = i + 1;
        while (j < rawText.length && NAME_CHAR.test(rawText[j])) j++;
        // El punto final de oración no forma parte del nombre
        let end = j;
        let name = rawText.slice(i + 1, end);
        while (name.endsWith(".")) {
          end--;
          name = name.slice(0, -1);
        }
        if (name.length > 0) {
          tags.push({ symbol: ch as TagSymbol, name, start: i, end });
          i = end;
          continue;
        }
      }
      // No es etiqueta: símbolo literal (ej. "perfil 20/20")
      display += ch;
      i++;
      continue;
    }

    display += ch;
    i++;
  }

  return { displayText: display.replace(/\s+/g, " ").trim(), tags };
}

/** Agrupa nombres parseados por símbolo, normalizados y sin duplicados. */
export function tagsBySymbol(tags: readonly ParsedTag[]): Record<TagSymbol, string[]> {
  const out: Record<TagSymbol, string[]> = { "/": [], "#": [], "@": [], "$": [] };
  const seen = new Set<string>();
  for (const t of tags) {
    const key = t.symbol + normalizeTagName(t.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out[t.symbol].push(t.name);
  }
  return out;
}
