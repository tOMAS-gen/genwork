import type { Config } from "tailwindcss";
import genUiPreset from "@gen/ui/tailwind-preset";

// Colores, radios, sombras y escala tipográfica vienen del preset de @gen/ui
// (mapean los tokens CSS). Preflight sigue desactivado: el reset es el de gen-ui.
const config: Config = {
  presets: [genUiPreset],
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
