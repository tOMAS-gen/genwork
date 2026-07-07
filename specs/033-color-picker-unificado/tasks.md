# Tasks: Color picker unificado

**Input**: Design documents from `specs/033-color-picker-unificado/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/color-picker-component.md

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Setup — Dominio de color + migración

- [X] T001 [P] [sonnet] Crear `src/lib/domain/colors/palette.ts`: `PRESET_COLORS: {name,hex}[]` (paleta única derivada de los colores canónicos: RED #ef4444, ORANGE #f97316, AMBER #f59e0b, GREEN #22c55e, TEAL #14b8a6, BLUE #3b82f6, INDIGO #6366f1, VIOLET #8b5cf6, PINK #ec4899, GRAY #6b7280, + Esmeralda #10b981 y Marrón #92400e si se conservan de stages) y `labelColorToHex(name): string|null` (mapeo enum→hex).
- [X] T002 [P] [sonnet] Crear `src/lib/domain/colors/colorConvert.ts` con funciones puras: `hexToRgb`, `rgbToHex`, `hexToHsv`, `hsvToHex`, `isValidHex`, `normalizeHex`.
- [X] T003 [P] [sonnet] Crear `src/lib/domain/colors/contrast.ts`: `relativeLuminance(hex)` (WCAG) y `textOn(hex): "#ffffff"|"#111111"`.
- [X] T004 [opus] Crear la migración `prisma/migrations/0033_colors_to_hex/` y actualizar `prisma/schema.prisma`: cambiar `Sector.color` (`LabelColor?`→`String?`) y `LabelValue.color` (`LabelColor`→`String`); `UPDATE` convirtiendo cada enum a su hex (mapeo de T001); normalizar `Group.color`/`ProjectStage.color` (nombres de enum → hex, dejar los que ya son `#...`); retirar `enum LabelColor` del schema si queda sin uso. Aplicar con `npm run db:migrate` y verificar que los datos quedan en hex sin pérdida.
- [X] T005 [P] [sonnet] Tests de dominio en `src/lib/domain/colors/__tests__/`: ida-vuelta `hsvToHex(hexToHsv(x))≈x`, `isValidHex` (válidos/ inválidos), `normalizeHex`, `textOn` (claro→oscuro, oscuro→claro), `labelColorToHex` para los 10 enums.

---

## Phase 2: Foundational — Componente + CSS de render (BLOQUEA US1; entrega US2 y US3)

- [X] T006 [sonnet] Crear `src/components/ui/ColorPicker.tsx` (componente cliente) según contracts/color-picker-component.md: área de saturación/brillo, slider de hue, input hex (valida con `isValidHex`/`normalizeHex`, no rompe ante inválido), fila de swatches `PRESET_COLORS` (click asigna, resalta el actual), preview en vivo, prop `nullable`. Sin opacidad ni "+ Add". Usa `colorConvert` y `palette`. Cubre US2 (FR-004/005/010) y US3 (FR-003/006).
- [X] T007 [sonnet] En `src/app/globals.css` agregar las clases de render basadas en hex: `.color-chip` (`background: color-mix(in srgb, var(--c) 14%, var(--surface)); color: color-mix(in srgb, var(--c) 80%, var(--text))`), `.color-dot`, `.color-bar`, `.color-badge` (usan `var(--c)`), tomando `--c` de un `style` inline. Mantener temporalmente las `.label-<color>` hasta migrar los consumidores (T012).

---

## Phase 3: User Story 1 — Un único selector en toda la app (Priority: P1) 🎯 MVP

**Goal**: Las 4 entidades usan el mismo `ColorPicker`; ningún selector viejo permanece; el render sale del hex.

**Independent Test**: Abrir el selector en grupo/sector/etapa/etiqueta → es el mismo componente; los colores previos se ven igual.

- [X] T008 [US1] [sonnet] Grupos: reemplazar la paleta de dots por `<ColorPicker nullable/>` en `src/components/groups/CreateGroupDialog.tsx` y `src/app/(main)/groups/[id]/page.tsx` (quitar `COLOR_OPTIONS`/`GROUP_COLORS`, el popup de dots y el estado showPalette). El PATCH manda hex.
- [X] T009 [US1] [sonnet] Sectores: reemplazar la paleta de dots por `<ColorPicker nullable/>` en `src/components/sectors/CreateSectorDialog.tsx`; actualizar `src/lib/domain/sectors/colorAssign.ts` para rotar sobre `PRESET_COLORS` (hex) en vez del enum.
- [X] T010 [US1] [sonnet] Etapas: reemplazar el grid `ColorSwatch`/`PALETTE` por `<ColorPicker/>` en `src/app/(main)/admin/stages/page.tsx`.
- [X] T011 [US1] [sonnet] Etiquetas: reemplazar el `<select>` de color por `<ColorPicker/>` en `src/components/works/LabelAdmin.tsx` (crear/editar valor). El POST/PUT manda hex.
- [X] T012 [US1] [sonnet] Migrar el render de color de las clases `.label-<enum>` a `style={{["--c"]:hex}}` + las clases nuevas (`.color-chip`/`.color-dot`/etc.) en TODOS los consumidores: `src/components/tasks/TaskItem.tsx`, `src/components/tasks/TaskListEditor.tsx` (dropdown de etiquetas `$` del feature 032, que muestra `project-dot label-<color>`), `src/components/works/LabelPicker.tsx`, `src/components/works/LabelAdmin.tsx`, `src/components/dashboard/ProjectCard.tsx`, `src/components/dashboard/ProjectListRow.tsx`, `src/components/sectors/SectorCard.tsx`, `src/app/(main)/works/[id]/page.tsx`, `src/app/(main)/sectors/page.tsx`, `src/app/(main)/groups/[id]/page.tsx`. Retirar las `.label-<color>` de globals.css una vez sin uso. Buscá con grep `label-\$\{` y `label-` para no dejar ningún consumidor del enum sin migrar.
- [X] T013 [US1] [sonnet] Validación de hex en los endpoints que reciben color: `src/app/api/groups/[id]/route.ts`, `src/app/api/sectors/[id]/route.ts`, `src/app/api/stages/[id]/route.ts`, `src/app/api/labels/values/route.ts` (y creación donde aplique) — usar `isValidHex`, responder 400 si inválido.

**Checkpoint**: US1 = MVP (un solo selector, todo en hex, render unificado).

---

## Phase 4: Polish & Verificación

- [X] T014 [P] [sonnet] Completar cobertura de tests de dominio de color (casos de borde de `isValidHex`, contraste en colores límite) en `src/lib/domain/colors/__tests__/`.
- [X] T015 [haiku] Ejecutar `npm run lint`, `npm test` y `npm run build`; validar los escenarios de `quickstart.md` (mismo selector en las 4 entidades, colores previos preservados en claro/oscuro). Corregir lo que falle.

---

## Dependencies & Execution Order

- **Phase 1**: T001 [P] T002 [P] T003 [P]; T004 depende de T001 (mapeo); T005 [P] depende de T001–T003.
- **Phase 2**: T006 depende de T001+T002; T007 [P] independiente. Ambos BLOQUEAN US1. Entregan US2/US3.
- **Phase 3 (US1)**: T008–T011 [P entre sí] dependen de T006 (componente) + T004 (datos hex). T012 depende de T007 (clases CSS). T013 [P] depende de T002 (isValidHex).
- **Phase 4**: T014 [P], T015 al final.

### Parallel Opportunities

- T001 ‖ T002 ‖ T003 (dominio, archivos distintos).
- T008 ‖ T009 ‖ T010 ‖ T011 (cada entidad su archivo) una vez listo T006.
- T013 en paralelo a los reemplazos de UI.

### MVP Scope

**US1 (Phases 1+2+3)** entrega el objetivo: un único selector de color en toda la app, con almacenamiento hex y render unificado. US2 (custom) y US3 (preestablecidos) las entrega el componente `ColorPicker` (T006) dentro de la fase foundational.
