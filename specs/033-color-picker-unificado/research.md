# Research: Color picker unificado

Basado en el mapeo del subagente Explore: modelo mixto (`LabelColor` enum en Sector/LabelValue; `String` hex en Group/ProjectStage), 4 selectores distintos, paleta CSS `.label-<color>` con tokens `--palette-<color>-bg/-text/-accent`, y stages con hex directos.

## R1 — Almacenamiento unificado a hex

**Decision**: Todos los campos de color se guardan como **string hex** (`#RRGGBB`). Se cambian `Sector.color` (`LabelColor?`) y `LabelValue.color` (`LabelColor`) a `String`. `Group.color` y `ProjectStage.color` ya son `String?` (se normalizan). El enum `LabelColor` se retira del schema si no queda otro uso.

**Rationale**: Un formato abierto soporta tanto swatches preestablecidos como color personalizado con un único tipo, eliminando la dualidad enum/hex.

**Alternatives considered**: mantener enum (rechazado en clarify — impide color libre); dos columnas (bg+text) por entidad (rechazado — duplica datos, se resuelve en cliente con color-mix).

## R2 — Migración enum→hex preservando aspecto

**Decision**: Mapear cada valor `LabelColor` a un hex "fuerte" canónico y migrar los datos:
`RED→#ef4444, ORANGE→#f97316, AMBER→#f59e0b, GREEN→#22c55e, TEAL→#14b8a6, BLUE→#3b82f6, INDIGO→#6366f1, VIOLET→#8b5cf6, PINK→#ec4899, GRAY→#6b7280` (alineado con la PALETTE de stages ya existente).
- `Sector.color` y `LabelValue.color`: `UPDATE` convirtiendo el enum a su hex.
- `Group.color`/`ProjectStage.color`: los que ya son hex quedan; los que guardan nombres de enum (`RED`) se convierten a hex.

**Rationale**: Reusa los hex "fuertes" que ya usa el picker de stages, unificando ambas paletas (10 enum + 12 stages) en un set coherente. El aspecto se preserva vía R3 (color-mix reproduce el pastel).

## R3 — Render y contraste con hex arbitrario (preservar look + dark-mode)

**Decision**: Cada elemento coloreado expone el hex como custom property `--c: <hex>` y el CSS deriva las variantes:
- **Chip**: `background: color-mix(in srgb, var(--c) 14%, var(--surface)); color: color-mix(in srgb, var(--c) 80%, var(--text));` → reproduce el pastel (bg claro + texto del tono) desde cualquier hex, mezclando con los tokens del tema (funciona en claro y oscuro automáticamente).
- **Dot / barra / badge**: usan `var(--c)` directo.
- **Contraste de texto sobre fondo sólido** (si algún elemento usa el hex como fondo pleno): función `textOn(hex)` por luminancia relativa (WCAG) → blanco o negro.

**Rationale**: `color-mix()` (soportado en navegadores modernos) reproduce el sistema pastel actual con un solo hex y respeta el tema, cumpliendo FR-008/FR-009 sin duplicar datos. La utilidad de contraste cubre los casos de fondo pleno.

**Alternatives considered**: precalcular bg/text por color en JS y setear inline (más verboso, no reacciona al tema tan limpio); mantener clases `.label-<enum>` (incompatible con color libre).

## R4 — Paleta preestablecida única

**Decision**: `PRESET_COLORS` en `src/lib/domain/colors/palette.ts`: lista única de swatches `{ name, hex }` derivada de los colores canónicos (los 10 del enum + los extra útiles de stages como Esmeralda/Marrón si se conservan). Es la fuente de verdad de los swatches del picker y del mapeo enum→hex (R2).

**Rationale**: Una sola definición elimina las 5 constantes locales dispersas (`COLOR_OPTIONS`, `GROUP_COLORS`, `SECTOR_COLORS`, `PALETTE`, `COLORS`).

## R5 — Componente ColorPicker propio (sin dependencias)

**Decision**: `src/components/ui/ColorPicker.tsx`, componente cliente con: (a) área de saturación/brillo, (b) slider de hue, (c) input hex, (d) fila de swatches `PRESET_COLORS`, (e) preview del color actual. `props: { value: string | null; onChange: (hex: string) => void; presets?; }`. La conversión HSV↔RGB↔hex y validación viven en `src/lib/domain/colors/colorConvert.ts` (puro, testeable).

**Rationale**: Evita dependencias externas (constraint del proyecto) y da control total sobre el look (fidelidad al mockup). El área SB puede implementarse con gradientes CSS + captura de puntero.

**Alternatives considered**: `react-colorful`/similares (rechazado por evitar deps nuevas y por control del diseño).

## R6 — Alcance del reemplazo de selectores y render

**Decision**: Reemplazar los selectores en `CreateGroupDialog`, `groups/[id]/page`, `CreateSectorDialog`, `admin/stages/page`, `LabelAdmin` por `<ColorPicker/>`. Migrar el render de color de todos los consumidores (`TaskItem`, `LabelPicker`, `LabelAdmin`, `ProjectCard`, `ProjectListRow`, `SectorCard`, `works/[id]`, `sectors/page`, `groups/[id]`) de las clases `.label-<enum>` a `--c` + las clases derivadas por color-mix. La asignación automática de color a sectores (`colorAssign.ts`) pasa a rotar sobre `PRESET_COLORS` (hex).

**Rationale**: Cumple FR-001/FR-002 (un solo selector, cero selectores viejos) y FR-009 (render consistente por hex).

**Riesgo/di mitigación**: es un cambio transversal; se hace por fases (dominio+componente primero, luego cada selector, luego render), verificando en preview que los colores existentes se ven igual (FR-008) antes de dar por cerrado.
