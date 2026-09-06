# Design System Master — GenWork

La implementación visual sigue [GENSTOCK_PARITY.md](./GENSTOCK_PARITY.md) y [DESIGN.md](../../DESIGN.md). Los tokens de `src/app/globals.css` son la fuente ejecutable y se comparten con Tailwind. Si existe una especificación de página en `design-system/pages/`, consultarla antes de editar esa pantalla.

## Componentes

| Rol | Especificación |
| --- | --- |
| Tipografía | Montserrat; Roboto Mono para datos técnicos |
| Título de pantalla | 24px, peso 700 |
| Acción | 13px, peso 600, sentence case |
| Chip | Radio 4px; color semántico o elegido por el usuario |
| Botón y campo | Radio 6px; borde y foco visibles |
| Card/panel | Radio 8px, padding 16px, borde 1px, sin sombra ni lift |
| Menú/dialog | Superficie floating, radio 12px, sombra reservada al overlay |
| Navegación | Sidebar 240px, rail 48px, indicador activo 3px |
| Tema | Tokens light/dark; azul #3B5BFA / #5B7FFF |
| Iconos | Material Symbols Outlined SVG, adaptador central |

## Reglas

- Mantener estructura y funciones de GenWork; usar GenStock como referencia visual.
- No agregar gradientes, glassmorphism, ruido, elevación decorativa ni secciones de marketing.
- Usar tokens compartidos en lugar de inventar colores, radios o sombras por pantalla.
- Permitir que filtros y barras se distribuyan en varias filas en móvil; tablas y tabs pueden tener scroll propio.
- Mantener navegación por teclado, nombres accesibles, estados vacíos y de carga.
- Respetar preferencias de tema y movimiento reducido.
