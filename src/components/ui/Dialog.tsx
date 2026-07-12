"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/ui/icons";

/**
 * Diálogo accesible sobre `<dialog>` nativo (research R3): foco atrapado, Esc
 * cierra, scrim y retorno de foco los maneja el navegador.
 *
 * Estilos con Tailwind (T004): el marco (fondo, borde, radio, sombra, tipografía
 * del título, botón de cerrar) se resuelve con utilities. El `::backdrop` nativo
 * del `<dialog>` no acepta utilities normales (no aplican a pseudo-elementos), así
 * que se usa el arbitrary variant `[&::backdrop]:` de Tailwind en vez de una regla
 * CSS aparte en globals.css.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  allowOverflow,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Permite que contenido interno (ej. un popover flotante) se desborde visualmente
   * del rectángulo del diálogo en vez de recortarse (default del `<dialog>` nativo). */
  allowOverflow?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`w-[92%] max-w-[480px] rounded-[14px] border-none bg-surface p-0 text-text [box-shadow:var(--shadow-lg)] animate-[dialog-content-in_180ms_ease_forwards] [&::backdrop]:animate-[dialog-overlay-in_180ms_ease_forwards] [&::backdrop]:bg-[rgba(15,23,42,0.45)] [&::backdrop]:backdrop-blur-[3px] ${
        allowOverflow ? "overflow-visible" : ""
      }`}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // click en el backdrop (fuera del contenido) cierra
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="grid gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-xl font-semibold">{title}</h2>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted transition-colors duration-200 hover:bg-[var(--hover-soft)] hover:text-text"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
