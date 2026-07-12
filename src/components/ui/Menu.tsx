"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "@/components/ui/icons";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Menú contextual (⋮) accesible (research R6): botón + popover, Esc y click-fuera
 * cierran, aria-haspopup. `trigger` permite otro ícono (ej. hamburguesa del board).
 *
 * El popover se renderiza en un portal (`document.body`) con posición `fixed`
 * calculada desde el botón: así no queda recortado por ancestros con overflow
 * (ej. el scroll horizontal del tablero, feature 042) en vez de quedar "atrapado"
 * dentro de la tarjeta/columna.
 */
export function Menu({
  items,
  label = "Acciones",
  trigger,
  className,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (!open) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDismiss = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // Scroll (incluido el horizontal del tablero) o resize invalidan la posición calculada.
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open]);

  return (
    <div className={`menu-wrap ${className ?? ""}`}>
      <button
        ref={btnRef}
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggleOpen}
      >
        {trigger ?? <MoreVertical size={20} />}
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="menu-pop"
            role="menu"
            style={{ position: "fixed", top: pos.top, right: pos.right }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                role="menuitem"
                className={`menu-item ${item.danger ? "danger" : ""}`}
                disabled={item.disabled}
                aria-disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
