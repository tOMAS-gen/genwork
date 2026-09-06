# Design System — GenWork

GenWork comparte la identidad visual de GenStock y conserva su azul de marca.
La referencia detallada está en [GENSTOCK_PARITY.md](design-system/genwork/GENSTOCK_PARITY.md); los tokens ejecutables están en `src/app/globals.css`.

- Montserrat para la interfaz; Roboto Mono para códigos y valores técnicos. Cuerpo de 14px, títulos de pantalla de 24px/700, acciones de 13px/600, rótulos de 11px/700.
- Azul claro `#3b5bfa`, oscuro `#5b7fff`. Fondos oscuros acromáticos: `#0c0c0c`, `#151515`, `#1c1c1c`, `#262626`; borde `#272727`.
- Tema claro: página `#f4f5f8`, panel `#ffffff`, campo `#f1f3f6`, borde estructural `#d2d6de`, outline `#e3e6eb`.
- Radios por rol: chips 4px, controles 6px, cards 8px, overlays 12px. Círculos sólo para avatares, contadores y progreso.
- Sidebar 240px, rail 48px, barra superior 40px; padding de página y cards 16px. Selección con lengüeta de 3px.
- Material Symbols Outlined en SVG mediante `src/components/ui/icons.tsx`.
- Cards planas, sin elevación ni desplazamiento en hover. Sombras sólo para elementos flotantes.
- Transiciones de 150–200ms; respetar `prefers-reduced-motion`. Foco visible de 2px.
- Colores de etiquetas y estados conservan su significado y son independientes de la marca.
