/**
 * Conversiones de color hex ↔ RGB ↔ HSV y utilidades de validación/normalización.
 *
 * Funciones puras, sin I/O ni dependencias externas (feature 033). Usadas por el
 * `ColorPicker` (área de saturación/brillo + slider de hue) y por la validación de
 * los endpoints que reciben un campo `color` en formato hex.
 */

/** Componentes RGB, cada uno en el rango 0-255. */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** Componentes HSV: `h` en grados (0-360), `s` y `v` como fracción (0-1). */
export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

/** Expresión de un hex de 6 dígitos, sin `#`, ej. `"a1b2c3"`. */
const HEX6_RE = /^[0-9a-fA-F]{6}$/;
/** Expresión de un hex de 3 dígitos (forma corta), sin `#`, ej. `"abc"`. */
const HEX3_RE = /^[0-9a-fA-F]{3}$/;

/** Quita un `#` inicial si está presente. */
function stripHash(s: string): string {
  return s.startsWith("#") ? s.slice(1) : s;
}

/** Expande la forma corta `"abc"` a `"aabbcc"`. Asume que `s` ya matchea `HEX3_RE`. */
function expandShortHex(s: string): string {
  return s
    .split("")
    .map((ch) => ch + ch)
    .join("");
}

/**
 * Valida si `s` es un hex de color aceptable: 3 o 6 dígitos hexadecimales,
 * con o sin `#` inicial (ej. `"#fff"`, `"fff"`, `"#a1b2c3"`, `"a1b2c3"`).
 * No acepta formas con canal alfa (8 u 4 dígitos) ni nombres de color CSS.
 */
export function isValidHex(s: string): boolean {
  if (typeof s !== "string") return false;
  const body = stripHash(s.trim());
  return HEX6_RE.test(body) || HEX3_RE.test(body);
}

/**
 * Normaliza un hex a la forma canónica `#rrggbb` en minúsculas, expandiendo
 * la forma corta `#rgb` si corresponde. Devuelve `null` si `s` no es un hex válido
 * (ver `isValidHex`).
 */
export function normalizeHex(s: string): string | null {
  if (!isValidHex(s)) return null;
  const body = stripHash(s.trim());
  const full = HEX3_RE.test(body) ? expandShortHex(body) : body;
  return `#${full.toLowerCase()}`;
}

/**
 * Convierte un hex (`#rgb` o `#rrggbb`, con o sin `#`) a sus componentes RGB (0-255).
 * Devuelve `null` si el hex es inválido.
 */
export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const body = normalized.slice(1);
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

/** Clampea `n` al rango entero [0, 255]. */
function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

/** Convierte un byte (0-255) a sus 2 dígitos hex en minúsculas. */
function byteToHex(n: number): string {
  return clampByte(n).toString(16).padStart(2, "0");
}

/** Convierte componentes RGB (0-255) a un hex `#rrggbb` en minúsculas. */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

/**
 * Convierte un hex a HSV (`h` en 0-360, `s`/`v` en 0-1).
 * Devuelve `null` si el hex es inválido.
 */
export function hexToHsv(hex: string): HsvColor | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/** Convierte HSV (`h` en 0-360, `s`/`v` en 0-1) a un hex `#rrggbb` en minúsculas. */
export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, s));
  const val = Math.min(1, Math.max(0, v));

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return rgbToHex((rPrime + m) * 255, (gPrime + m) * 255, (bPrime + m) * 255);
}
