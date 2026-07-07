# Quickstart: Color picker unificado

## Prerrequisitos

```bash
npm run db:migrate     # aplica 0033_colors_to_hex (enum→hex)
npm run dev            # http://localhost:3010
```

## Escenario 1 — Mismo selector en las 4 entidades (US1, FR-001/002, SC-004)

1. Abrí el selector de color en: un **grupo**, un **sector**, una **etapa** (admin/stages) y un **valor de etiqueta** (admin/labels).
2. **Esperado**: en los 4 es el MISMO componente (área SB + hue + hex + swatches). Ningún selector viejo (dots sueltos, dropdown, ColorSwatch grid) permanece.

## Escenario 2 — Color personalizado (US2, FR-004/005/010)

1. En cualquier selector, mové el área de saturación/brillo y el hue.
2. **Esperado**: el preview y el hex se actualizan en vivo.
3. Escribí un hex válido (ej. `#4F46E5`) → el color se adopta. Escribí uno inválido → no rompe, mantiene el anterior.

## Escenario 3 — Preestablecido (US3, FR-003/006)

1. Pulsá un swatch de la fila de preestablecidos.
2. **Esperado**: se asigna en una acción; al reabrir, el actual aparece resaltado.

## Escenario 4 — Preservación de colores existentes (FR-008, SC-003)

1. Antes de migrar, anotá el color de un par de grupos/sectores/etiquetas.
2. Aplicá la migración `0033`.
3. **Esperado**: esos elementos se ven con el mismo color (chips pastel, dots, badges) en modo claro y oscuro.

## Escenario 5 — Contraste y dark-mode (FR-009, SC-005)

1. Elegí un color muy claro y uno muy oscuro para etiquetas.
2. Cambiá entre modo claro y oscuro.
3. **Esperado**: el texto de los chips permanece legible en ambos modos.

## Checks automatizados

```bash
npm run lint
npm test        # colorConvert (hsv↔hex ida y vuelta), contrast (textOn), palette (enum→hex), isValidHex
npm run build
```
