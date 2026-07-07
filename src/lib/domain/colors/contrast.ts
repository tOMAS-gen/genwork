/**
 * Contraste de color (feature 033).
 *
 * Utilidades puras para decidir qué texto es legible sobre un fondo
 * de color arbitrario (hex), usando luminancia relativa WCAG.
 *
 * Funciones puras, sin I/O.
 */

/** Parse mínimo de `#rrggbb` a componentes RGB (0-255). Devuelve `null` si es inválido. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Linealiza un canal sRGB (0-255) según la fórmula estándar WCAG. */
function linearizeChannel(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Luminancia relativa WCAG (0-1) de un color hex `#rrggbb`.
 * Devuelve `0` si el hex es inválido.
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const r = linearizeChannel(rgb.r);
  const g = linearizeChannel(rgb.g);
  const b = linearizeChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Color de texto legible sobre un fondo `hex`: blanco si el fondo es
 * oscuro, oscuro (`#111111`) si el fondo es claro.
 */
export function textOn(hex: string): "#ffffff" | "#111111" {
  return relativeLuminance(hex) > 0.5 ? "#111111" : "#ffffff";
}
