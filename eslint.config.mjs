import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ya exporta flat-config (arrays de config objects), así que
// no hace falta el puente FlatCompat que usábamos con la config legacy de la v15.
const config = [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "build/**", "coverage/**", "*.min.js"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Deuda técnica conocida: las reglas nuevas de `react-hooks` v6 (las del React
    // Compiler) marcan ~40 usos previos a la migración a Next 16. Quedan en `warn`
    // para no bloquear el lint mientras se migran componente por componente.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default config;
