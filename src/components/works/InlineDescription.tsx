"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";

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
    savedRef.current = trimmed;
    try {
      await api(`/api/works/${workId}`, {
        method: "PATCH",
        body: JSON.stringify({ description: trimmed || null }),
      });
    } catch {
      setValue(savedRef.current);
      toast("Error al guardar la descripción", "error");
    }
  }, [value, workId, toast]);

  if (!editable) {
    return value ? <p className="inline-desc inline-desc-readonly">{value}</p> : null;
  }

  return (
    <textarea
      ref={textareaRef}
      className="inline-desc-editor"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void save()}
      placeholder="Agregar descripción..."
      rows={1}
    />
  );
}
