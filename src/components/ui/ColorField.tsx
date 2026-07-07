"use client";

import { useEffect, useId, useRef, useState } from "react";
import { normalizeHex } from "@/lib/domain/colors/colorConvert";
import { ColorPicker, type ColorPickerProps } from "@/components/ui/ColorPicker";

/**
 * Campo de color compacto: un disparador (swatch del color actual + hex) que
 * abre el `ColorPicker` en un popover. Evita que el panel del picker ocupe
 * espacio inline y rompa el layout de los formularios (feature 033 / pulido UI).
 *
 * Cierra con click afuera, Escape o volviendo a tocar el disparador. El color
 * se propaga en vivo por `onChange` mientras el popover está abierto.
 */
export function ColorField({
  value,
  onChange,
  presets,
  nullable = false,
  ariaLabel = "Elegir color",
  align = "start",
}: ColorPickerProps & { align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const swatch = value ? (normalizeHex(value) ?? value) : null;

  // Cierre por click afuera + Escape; al cerrar, devolver el foco al disparador.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="color-field" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="color-field-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={swatch ? `${ariaLabel} (${swatch.toUpperCase()})` : `${ariaLabel} (sin color)`}
        title={swatch ? swatch.toUpperCase() : "Sin color"}
      >
        <span
          className={`entity-color-dot${swatch ? "" : " entity-color-dot-empty"}`}
          style={swatch ? { background: swatch } : undefined}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={ariaLabel}
          className={`color-field-popover color-field-popover-${align}`}
        >
          <ColorPicker
            value={value}
            onChange={onChange}
            presets={presets}
            nullable={nullable}
            ariaLabel={ariaLabel}
            onClose={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
        </div>
      )}
    </div>
  );
}
