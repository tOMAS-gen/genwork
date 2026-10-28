import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// T39 (spec 066): los tokens de la web de genwork coinciden con GenColors de
// la app Android. La web pisa los de @gen/ui en src/app/genwork-tokens.css.
const css = readFileSync("src/app/genwork-tokens.css", "utf8");
const dart = readFileSync("mobile/lib/core/theme/gen_colors.dart", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

/** Bloque de una paleta de GenColors (`light` o `dark`) → nombre: #rrggbb. */
function palette(name: "light" | "dark"): Record<string, string> {
  const block = dart.split(`static const ${name} = GenColors(`)[1].split(");")[0];
  const out: Record<string, string> = {};
  for (const [, key, argb] of block.matchAll(/(\w+): Color\(0x([0-9A-Fa-f]{8})\)/g)) {
    out[key] = `#${argb.slice(2).toLowerCase()}`;
  }
  return out;
}

/** Valor de una variable en el bloque `:root` o `[data-theme="dark"]`. */
function token(scope: ":root" | "dark", name: string): string | undefined {
  const selector = scope === ":root" ? ":root {" : '[data-theme="dark"] {';
  const block = css.split(selector)[1]?.split("}")[0] ?? "";
  return block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim().toLowerCase();
}

describe("tokens de genwork = GenColors", () => {
  it("se cargan después del tema de @gen/ui", () => {
    expect(layout.indexOf("./genwork-tokens.css")).toBeGreaterThan(
      layout.indexOf("@gen/ui/themes/genwork.css"),
    );
  });

  it("contorno de campos a 3:1 en los dos temas", () => {
    expect(token(":root", "control")).toBe(palette("light").control);
    expect(token("dark", "control")).toBe(palette("dark").control);
    expect(css).toMatch(/border-color:\s*var\(--control\)/);
  });

  it("escalones oscuros, verde y ámbar como en Android", () => {
    const dark = palette("dark");
    expect(token("dark", "surface")).toBe(dark.surface);
    expect(token("dark", "field")).toBe(dark.field);
    expect(token("dark", "ok")).toBe(dark.ok);
    expect(token("dark", "color-success")).toBe(dark.success);
    expect(token("dark", "color-warning")).toBe(dark.warning);
    expect(token("dark", "color-warning-text")).toBe(dark.warningText);
    expect(token("dark", "color-favorite")).toBe(dark.favorite);
    expect(token("dark", "tag-date")).toBe(dark.dueText);
  });

  it(".main usa 16 px de margen en el teléfono", () => {
    expect(css).toMatch(/@media \(max-width: 767px\)\s*{\s*\.main\s*{\s*padding: 16px;/);
  });
});
