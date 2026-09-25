import { parseTags } from "@/lib/domain/tags/parser";

/**
 * objetivos: saca los tags de trabajo (`/proyecto`) del `rawText` de una
 * tarea copiada desde una plantilla. Si quedaran, al editar la copia
 * `saveTask` resolvería el `/` de nuevo y la tarea se mudaría al proyecto (o
 * plantilla) de origen.
 *
 * - Usa los offsets `start`/`end` de `parseTags`, así que solo toca lo que el
 *   parser reconoce como tag: el escape `//` y un `/` sin borde ("20/20")
 *   quedan intactos.
 * - `#`, `@` y `$` no se tocan.
 * - Colapsa los espacios y tabs que quedan dobles y hace trim.
 * - Si justo después del tag borrado venía un símbolo pegado ("/Obra#x"), ese
 *   símbolo pasaba a quedar con borde y se volvería un tag nuevo; se escapa
 *   duplicándolo, así el texto visible y los tags restantes no cambian.
 */
export function stripWorkTags(rawText: string): string {
  const workTags = parseTags(rawText).tags.filter((t) => t.symbol === "/");
  if (workTags.length === 0) return rawText;

  let out = "";
  let cursor = 0;
  for (const tag of workTags) {
    out += rawText.slice(cursor, tag.start);
    const next = rawText[tag.end];
    if (next !== undefined && isTagSymbol(next) && rawText[tag.end + 1] !== next) {
      out += next;
    }
    cursor = tag.end;
  }
  out += rawText.slice(cursor);

  return out.replace(/[ \t]{2,}/g, " ").trim();
}

function isTagSymbol(ch: string): boolean {
  return ch === "/" || ch === "#" || ch === "@" || ch === "$";
}
