"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { CharLimit } from "@/components/ui/CharLimit";
import { OBJECTIVE_DESCRIPTION_MAX } from "@/lib/domain/objectives/validation";

export function InlineDescription({
  workId,
  initialValue,
  editable,
}: {
  workId: string;
  initialValue: string | null;
  editable: boolean;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [focused, setFocused] = useState(false);
  const savedRef = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(autoResize, [autoResize, value]);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    if (trimmed === savedRef.current) return;
    const previous = savedRef.current;
    savedRef.current = trimmed;
    try {
      await api(`/api/works/${workId}`, {
        method: "PATCH",
        body: JSON.stringify({ description: trimmed || null }),
      });
    } catch (err) {
      // Se revierte a lo último guardado (no al texto rechazado) y se muestra el
      // motivo del servidor: un genérico ocultaba, p. ej., el tope de largo.
      savedRef.current = previous;
      setValue(previous);
      toast(`No se guardó la descripción: ${(err as Error).message}`, "error");
    }
  }, [value, workId, toast]);

  if (!editable) {
    return value ? <p className="inline-desc inline-desc-readonly">{value}</p> : null;
  }

  return (
    <>
      <textarea
        ref={textareaRef}
        className="inline-desc-editor"
        aria-label="Descripción del proyecto"
        aria-describedby={focused ? `desc-limit-${workId}` : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          void save();
        }}
        placeholder="Agregar descripción..."
        maxLength={OBJECTIVE_DESCRIPTION_MAX}
        rows={1}
      />
      {/* En el encabezado el contador solo aparece mientras se escribe. */}
      {focused && <CharLimit id={`desc-limit-${workId}`} length={value.length} max={OBJECTIVE_DESCRIPTION_MAX} />}
    </>
  );
}
