"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "@/components/ui/icons";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

/**
 * Menú contextual (⋮) accesible (research R6): botón + popover, Esc y click-fuera
 * cierran, aria-haspopup. `trigger` permite otro ícono (ej. hamburguesa del board).
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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`menu-wrap ${className ?? ""}`} ref={wrapRef}>
      <button
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger ?? <MoreVertical size={20} />}
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              className={`menu-item ${item.danger ? "danger" : ""}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
