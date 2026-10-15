"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

/**
 * Botón "Copiar" accesible: nombre descriptivo para lectores de pantalla y aviso
 * "Copiado" anunciado por `aria-live` (mismo patrón que el código del proyecto).
 */
export function CopyButton({
  value,
  label,
  className = "btn btn-outline",
}: {
  value: string;
  /** Qué se copia, para el nombre accesible: "Copiar {label}". */
  label: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleCopy() {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast("No se pudo copiar", "error"));
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
