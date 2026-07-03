"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/ui/icons";

/**
 * Diálogo accesible sobre `<dialog>` nativo (research R3): foco atrapado, Esc
 * cierra, scrim y retorno de foco los maneja el navegador.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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
      className="dialog"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // click en el backdrop (fuera del contenido) cierra
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="dialog-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
