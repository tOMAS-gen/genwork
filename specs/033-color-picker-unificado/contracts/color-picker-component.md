# Contract: Componente ColorPicker + render

## Componente `<ColorPicker>` (`src/components/ui/ColorPicker.tsx`)

```ts
interface ColorPickerProps {
  value: string | null;              // hex actual (#RRGGBB) o null
  onChange: (hex: string) => void;   // se llama con un hex válido
  presets?: { name: string; hex: string }[]; // default: PRESET_COLORS
  nullable?: boolean;                // permite "sin color" (grupos/sectores lo permiten)
  ariaLabel?: string;
}
```

Comportamiento (según guía visual `assets/color-picker-guia.png`):
- Área de saturación/brillo (2D) + slider de hue (1D) → definen el color; el preview y el hex se actualizan en vivo (FR-005).
- Input hex editable; valida y normaliza (`isValidHex`/`normalizeHex`); inválido no rompe la selección (FR-010).
- Fila de swatches `presets`: click asigna en una acción (FR-003); el swatch/valor actual se resalta (FR-006).
- Sin control de opacidad (FR-011). Sin "+ Add" en v1.
- `nullable`: opción para dejar sin color donde aplica (grupos/sectores).

## Utilidades puras

```ts
// colorConvert.ts
hexToRgb(hex): {r,g,b}; rgbToHex(r,g,b): string;
hexToHsv(hex): {h,s,v}; hsvToHex(h,s,v): string;
isValidHex(s): boolean; normalizeHex(s): string | null;

// contrast.ts
relativeLuminance(hex): number;
textOn(hex): "#ffffff" | "#111111";

// palette.ts
PRESET_COLORS: { name: string; hex: string }[];
labelColorToHex(name: string): string | null;   // mapeo enum→hex (migración + back-compat)
```

## Render (CSS)

Cada elemento coloreado setea `style={{ ["--c"]: hex }}` y usa clases:
- `.color-chip` → `background: color-mix(in srgb, var(--c) 14%, var(--surface)); color: color-mix(in srgb, var(--c) 80%, var(--text));`
- `.color-dot`, `.color-bar`, `.color-badge` → usan `var(--c)` directo.

Las clases `.label-<enum>` existentes se retiran/redirigen una vez migrados todos los consumidores.

## API (sin cambios de forma, + validación)

`PATCH /api/groups/{id}`, `/api/sectors/{id}`, `/api/stages/{id}`, `POST|PUT /api/labels/values` — el campo `color` ahora acepta/espera hex; validar con `isValidHex` (400 si inválido).
