"use client";

import { useEffect, useRef, useState } from "react";
import { hexToHsv, hsvToHex, isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { PRESET_COLORS, type PresetColor } from "@/lib/domain/colors/palette";
import { Check, X, SlidersHorizontal } from "@/components/ui/icons";

export interface ColorPickerProps {
  /** Hex actual (`#rrggbb`) o `null` si no hay color asignado. */
  value: string | null;
  /** Se llama con un hex normalizado (`#rrggbb`) en cada cambio confirmado. */
  onChange: (hex: string) => void;
  /** Swatches preestablecidos. Default: `PRESET_COLORS`. */
  presets?: PresetColor[];
  /** Si es `true`, ofrece una opción para dejar la entidad sin color. */
  nullable?: boolean;
  /** Label accesible del componente completo. */
  ariaLabel?: string;
  /**
   * Si se provee, el picker muestra controles para cerrarse (X arriba y botón
   * "Listo" abajo). Lo usan los contenedores en popover (ColorField, etc.).
   */
  onClose?: () => void;
}

/** Hex de respaldo cuando `value` es `null`/inválido (punto de partida del área SB). */
const FALLBACK_HEX = "#3b82f6";

/**
 * Selector de color unificado (feature 033): área de saturación/brillo (2D) +
 * slider de hue (1D) + input hex + swatches preestablecidos. Sin control de
 * opacidad (siempre 100%) y sin guardado de colores custom ("+ Add" fuera de v1).
 *
 * Las conversiones HSV↔hex viven en `colorConvert.ts` (puro); este componente
 * solo gestiona interacción (pointer events) y estado local de edición.
 */
export function ColorPicker({
  value,
  onChange,
  presets = PRESET_COLORS,
  nullable = false,
  ariaLabel = "Selector de color",
  onClose,
}: ColorPickerProps) {
  const activeHex = normalizeHex(value ?? "") ?? FALLBACK_HEX;
  const hsv = hexToHsv(activeHex) ?? { h: 217, s: 0.76, v: 0.96 };

  // El hue se mantiene en estado propio: cuando s=0 o v=0, hexToHsv no puede
  // recuperar el hue anterior (se pierde en la conversión), y el slider saltaría
  // a 0 en cada re-render. Se sincroniza solo cuando el hex activo cambia "de afuera".
  const [hue, setHue] = useState(hsv.h);
  const lastHexRef = useRef(activeHex);
  useEffect(() => {
    if (lastHexRef.current !== activeHex) {
      lastHexRef.current = activeHex;
      setHue(hexToHsv(activeHex)?.h ?? hue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHex]);

  const [hexInput, setHexInput] = useState(activeHex);
  useEffect(() => {
    setHexInput(activeHex);
  }, [activeHex]);

  // Modo compacto (feature 033 / pulido): el área SB + hue arrancan ocultos y
  // se despliegan con "Personalizado". Si el color activo no coincide con ningún
  // preset, es un color custom → abrir el área directamente para poder ajustarlo.
  const matchesPreset = presets.some((p) => normalizeHex(p.hex) === normalizeHex(activeHex));
  const [showAdvanced, setShowAdvanced] = useState(value != null && !matchesPreset);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  function commit(h: number, s: number, v: number) {
    setHue(h);
    onChange(hsvToHex(h, s, v));
  }

  function handleSvPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = svRef.current;
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // pointerId no capturable (ej. evento sintético/no confiable): se ignora,
      // el drag sigue funcionando vía los listeners de window agregados abajo.
    }

    const update = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const v = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      commit(hue, s, v);
    };
    update(e.clientX, e.clientY);

    const onMove = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleHuePointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = hueRef.current;
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ver comentario en handleSvPointer
    }

    const update = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      commit(ratio * 360, hsv.s, hsv.v);
    };
    update(e.clientX);

    const onMove = (ev: PointerEvent) => update(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleHexChange(raw: string) {
    setHexInput(raw);
    const normalized = normalizeHex(raw);
    if (normalized) onChange(normalized);
    // hex inválido: se mantiene el texto tipeado pero no se propaga (FR-010)
  }

  function handleHexBlur() {
    // al salir del campo, si quedó un valor inválido, se revierte al hex activo
    if (!isValidHex(hexInput)) setHexInput(activeHex);
  }

  const hueColor = `hsl(${hue}, 100%, 50%)`;
  const isSelected = (hex: string) => value != null && normalizeHex(value) === normalizeHex(hex);

  return (
    <div className="color-picker" role="group" aria-label={ariaLabel}>
      {onClose && (
        <div className="color-picker-header">
          <span className="color-picker-title">Color</span>
          <button
            type="button"
            className="icon-btn color-picker-close"
            onClick={onClose}
            aria-label="Cerrar selector de color"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Swatches preestablecidos (elección rápida, arriba) */}
      <div className="color-picker-swatches">
        {nullable && (
          <button
            type="button"
            className={`color-picker-swatch color-picker-swatch-none${value == null ? " color-picker-swatch-selected" : ""}`}
            onClick={() => onChange("")}
            aria-label="Sin color"
            aria-pressed={value == null}
            title="Sin color"
          >
            <X size={14} />
          </button>
        )}
        {presets.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            className={`color-picker-swatch${isSelected(preset.hex) ? " color-picker-swatch-selected" : ""}`}
            style={{ background: preset.hex }}
            onClick={() => onChange(preset.hex)}
            aria-label={preset.name}
            aria-pressed={isSelected(preset.hex)}
            title={preset.name}
          >
            {isSelected(preset.hex) && <Check size={14} className="color-picker-swatch-check" />}
          </button>
        ))}
      </div>

      {/* Fila hex + preview */}
      <div className="color-picker-row">
        <div className="color-picker-preview" style={{ background: activeHex }} aria-hidden="true" />
        <div className="color-picker-hex-field">
          <span className="color-picker-hex-prefix">#</span>
          <input
            type="text"
            className="color-picker-hex-input"
            value={hexInput.replace(/^#/, "")}
            onChange={(e) => handleHexChange(`#${e.target.value}`)}
            onBlur={handleHexBlur}
            maxLength={6}
            spellCheck={false}
            aria-label="Valor hexadecimal del color"
          />
        </div>
        <button
          type="button"
          className={`color-picker-advanced-toggle${showAdvanced ? " is-open" : ""}`}
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal size={15} />
          Personalizado
        </button>
      </div>

      {/* Área de saturación/brillo (2D) + slider de hue — solo modo avanzado */}
      {showAdvanced && (
        <>
          <div
            ref={svRef}
            className="color-picker-sv"
            style={{ ["--sv-hue" as string]: hueColor }}
            onPointerDown={handleSvPointer}
          >
            <div
              className="color-picker-sv-thumb"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: activeHex,
              }}
            />
          </div>

          <div ref={hueRef} className="color-picker-hue" onPointerDown={handleHuePointer}>
            <div
              className="color-picker-hue-thumb"
              style={{ left: `${(hue / 360) * 100}%`, background: hueColor }}
            />
          </div>
        </>
      )}

      {onClose && (
        <div className="color-picker-footer">
          <button type="button" className="btn btn-primary color-picker-done" onClick={onClose}>
            <Check size={15} />
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
