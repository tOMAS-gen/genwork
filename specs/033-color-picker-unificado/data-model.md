# Data Model: Color picker unificado

## Cambios de schema (Prisma)

| Modelo | Campo | Antes | Después |
|--------|-------|-------|---------|
| Sector | color | `LabelColor?` | `String?` (hex) |
| LabelValue | color | `LabelColor` | `String` (hex) |
| Group | color | `String?` | `String?` (hex, normalizado) |
| ProjectStage | color | `String?` | `String?` (hex, ya era hex) |

- El enum `LabelColor` se **retira** del schema si no queda ninguna referencia tras la migración.
- Todos los hex se validan en aplicación con `isValidHex` (formato `#RRGGBB`).

## Migración `0033_colors_to_hex`

Mapeo canónico enum → hex (fuente única en `src/lib/domain/colors/palette.ts`):

```
RED #ef4444 · ORANGE #f97316 · AMBER #f59e0b · GREEN #22c55e · TEAL #14b8a6
BLUE #3b82f6 · INDIGO #6366f1 · VIOLET #8b5cf6 · PINK #ec4899 · GRAY #6b7280
```

SQL (idempotente en la medida de lo posible):
1. Alterar tipo de columna `Sector.color` y `LabelValue.color` de `LabelColor` a `TEXT`.
2. `UPDATE` cada fila: reemplazar el nombre de enum por su hex (según el mapeo).
3. Para `Group.color`/`ProjectStage.color`: `UPDATE` filas cuyo valor sea un nombre de enum (`RED`, `BLUE`, …) por su hex; dejar intactos los que ya son `#...`.
4. (Opcional) `DROP TYPE "LabelColor"` si Prisma ya no lo referencia.

## Entidades de dominio (nuevas, puras)

- **PRESET_COLORS** (`palette.ts`): `{ name: string; hex: string }[]` — swatches + fuente del mapeo enum→hex.
- **colorConvert** (`colorConvert.ts`): `hexToHsv`, `hsvToHex`, `rgbToHex`, `hexToRgb`, `isValidHex`, `normalizeHex`.
- **contrast** (`contrast.ts`): `relativeLuminance(hex)`, `textOn(hex): "#fff" | "#111"`.

## Reglas

- **Validación**: todo color entrante (API PATCH de group/sector/stage/labelValue) valida hex; inválido → 400.
- **Preservación (FR-008)**: post-migración, cada entidad conserva su hex equivalente; el render (color-mix) reproduce el aspecto pastel previo.
- **Opacidad**: no se almacena; los hex son de 6 dígitos (opacos).
- **Render**: el color se aplica vía `style={{ ["--c"]: hex }}` + clases que usan `var(--c)` con `color-mix`.
