/**
 * Paleta de colores unificada del sistema (feature 033).
 *
 * Fuente única de verdad para:
 * - Los swatches preestablecidos que ofrece el `ColorPicker`.
 * - El mapeo del enum legado `LabelColor` (Prisma) a su hex canónico,
 *   usado por la migración `0033_colors_to_hex` y por cualquier código
 *   que todavía reciba nombres de enum.
 *
 * Funciones puras, sin I/O.
 */

/** Un color preestablecido de la paleta: nombre visible + hex. */
export interface PresetColor {
  name: string;
  hex: string;
}

/**
 * Paleta única de swatches preestablecidos.
 * Incluye los 10 colores del enum `LabelColor` original, Esmeralda y Marrón
 * (heredados de la paleta de stages) y 4 tonos adicionales (Cielo, Lima,
 * Fucsia, Pizarra) para dar más variedad al selector.
 */
export const PRESET_COLORS: PresetColor[] = [
  { name: "Rojo", hex: "#ef4444" },
  { name: "Naranja", hex: "#f97316" },
  { name: "Ámbar", hex: "#f59e0b" },
  { name: "Lima", hex: "#84cc16" },
  { name: "Verde", hex: "#22c55e" },
  { name: "Esmeralda", hex: "#10b981" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Cielo", hex: "#0ea5e9" },
  { name: "Azul", hex: "#3b82f6" },
  { name: "Índigo", hex: "#6366f1" },
  { name: "Violeta", hex: "#8b5cf6" },
  { name: "Fucsia", hex: "#d946ef" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Pizarra", hex: "#475569" },
  { name: "Marrón", hex: "#92400e" },
];

/** Mapeo canónico del enum `LabelColor` (Prisma) a su hex. */
const LABEL_COLOR_HEX: Record<string, string> = {
  RED: "#ef4444",
  ORANGE: "#f97316",
  AMBER: "#f59e0b",
  GREEN: "#22c55e",
  TEAL: "#14b8a6",
  BLUE: "#3b82f6",
  INDIGO: "#6366f1",
  VIOLET: "#8b5cf6",
  PINK: "#ec4899",
  GRAY: "#6b7280",
};

/**
 * Convierte un nombre del enum `LabelColor` a su hex canónico.
 * Case-insensitive. Devuelve `null` si `name` no matchea ningún valor del enum.
 */
export function labelColorToHex(name: string): string | null {
  const key = name.trim().toUpperCase();
  return LABEL_COLOR_HEX[key] ?? null;
}
