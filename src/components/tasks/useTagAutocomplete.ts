"use client";

import { useState } from "react";
import { api } from "@/components/ui/useApi";

/** Sugerencia de autocompletado devuelta por /api/tags/suggest. */
export interface Suggestion {
  id: string;
  name: string;
  type: "work" | "sector" | "user" | "label";
  /** Forma etiquetable (espacios→guion) que el endpoint puede aportar; si falta, cae a `name`. */
  insertText?: string;
  /** Clave interna de la etiqueta (solo `type: "label"`), para render/lookup del item. */
  keyName?: string;
  /** Color de la etiqueta (solo `type: "label"`), para render del item. */
  color?: string;
}

/** Etiqueta activa mientras se escribe: símbolo disparador y posición donde empieza. */
export interface ActiveTag {
  symbol: string;
  start: number;
}

const TAG_TRIGGER_RE = /(^|\s)([/#@$])([\p{L}\p{N}_\-.]*)$/u;

/**
 * Hook compartido de autocompletado de etiquetas `/` `#` `@` (feature 001, R2 de 004).
 * Extrae la lógica duplicada de TaskListEditor y TaskInlineEdit: detección del trigger,
 * fetch a /api/tags/suggest y armado del texto resultante al elegir una sugerencia.
 * No toca el DOM ni maneja el `<input>`: los componentes siguen siendo dueños del texto
 * y del caret; este hook solo calcula estado y el nuevo texto a aplicar.
 */
export function useTagAutocomplete({
  context,
}: {
  context: { workId?: string; sectorId?: string };
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTag, setActiveTag] = useState<ActiveTag | null>(null);

  const contextQuery = context.workId
    ? `contextWorkId=${context.workId}`
    : context.sectorId
      ? `contextSectorId=${context.sectorId}`
      : "";

  /** Detecta si hay un trigger activo antes del caret y busca sugerencias (sin debounce, igual que hoy). */
  const onTextChange = async (value: string, caret: number): Promise<void> => {
    const before = value.slice(0, caret);
    const match = TAG_TRIGGER_RE.exec(before);
    if (!match) {
      setActiveTag(null);
      setSuggestions([]);
      return;
    }
    const symbol = match[2];
    const query = match[3];
    // Vista de sector: `#` (hashtag de sector) queda deshabilitado en la UI.
    // `/` (proyecto) sigue funcionando normalmente.
    if (context.sectorId && symbol === "#") {
      setActiveTag(null);
      setSuggestions([]);
      return;
    }
    setActiveTag({ symbol, start: caret - query.length });
    const results = await api<Suggestion[]>(
      `/api/tags/suggest?symbol=${encodeURIComponent(symbol)}&q=${encodeURIComponent(query)}&${contextQuery}`,
    ).catch(() => []);
    setSuggestions(results);
  };

  /**
   * Pura respecto al texto: reemplaza el tramo de la etiqueta activa por `insertText ?? name`
   * seguido de un espacio. Además limpia el estado de sugerencias (efecto secundario aceptado).
   * Si no hay etiqueta activa devuelve el texto sin cambios.
   */
  const pick = (s: Suggestion, text: string, caret: number): string => {
    if (!activeTag) return text;
    const inserted = (s.insertText ?? s.name) + " ";
    const next = text.slice(0, activeTag.start) + inserted + text.slice(caret);
    setActiveTag(null);
    setSuggestions([]);
    return next;
  };

  /** Cierra las sugerencias sin modificar el texto (p. ej. Escape). */
  const clear = () => {
    setActiveTag(null);
    setSuggestions([]);
  };

  return { suggestions, activeTag, onTextChange, pick, clear };
}
