/**
 * Contador de caracteres bajo un campo con tope (`maxLength`).
 *
 * El campo ya no deja escribir de más; esto avisa cuánto queda y, al llegar al
 * tope, dice por qué no entra más texto (antes el corte era silencioso).
 */

export type CharLimitLevel = "normal" | "near" | "full";

/** A partir de este porcentaje del tope, el contador se resalta. */
const NEAR_RATIO = 0.9;

const fmt = (n: number) => n.toLocaleString("es-AR");

/** Derivación pura del cartel (testeable sin montar React). */
export function charLimitState(length: number, max: number): { text: string; level: CharLimitLevel } {
  if (length >= max) return { text: `Llegaste al límite de ${fmt(max)} caracteres`, level: "full" };
  return { text: `${fmt(length)} / ${fmt(max)}`, level: length >= max * NEAR_RATIO ? "near" : "normal" };
}

export function CharLimit({ length, max, id }: { length: number; max: number; id?: string }) {
  const { text, level } = charLimitState(length, max);
  return (
    <p id={id} className={`char-limit char-limit-${level}`} aria-live="polite">
      {text}
    </p>
  );
}
