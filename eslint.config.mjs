import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `eslint-config-next` exporta config estilo legacy (.eslintrc), no una función
// de flat-config; FlatCompat es el puente oficial de Next.js para cargarla sin
// pasar por la resolución de módulos que rompe con @rushstack/eslint-patch.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
  },
];

export default config;
