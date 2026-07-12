---

description: "Task list for feature 047-tailwind-piloto-sectores"

---

# Tasks: Rediseño visual de Sectores con Tailwind (piloto de migración)

**Input**: Design documents from `/specs/047-tailwind-piloto-sectores/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Sin tests nuevos — esta feature es de estilos, no de lógica (ver spec.md Assumptions y plan.md
Testing). La verificación es lint + build + test existentes (sin regresión) + los escenarios manuales de
`quickstart.md`.

**Organization**: Tareas agrupadas por user story. La instalación/configuración de Tailwind (T001-T003) es
compartida y bloqueante para todas las historias. `Dialog.tsx` (T004) es infraestructura compartida sin story
propia (es la excepción de FR-011, no pertenece a una sola historia de usuario) pero bloquea a US1/T007
(diálogo de creación) — por eso va justo después de Foundational.

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

## Path Conventions

Proyecto único (Next.js App Router monolito): `src/` y config en la raíz del repo.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Instalar y configurar Tailwind de verdad, mapeado contra los tokens existentes, sin tocar
todavía ningún componente de producto.

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta que T003 esté completo.

- [X] T001 [codex-medium] Instalar `tailwindcss@^3.4.0` (fijar la versión exacta — NO instalar sin pin, que traería v4 por default y rompería T002 entero, ver research.md Decisión 1: se necesita v3.4+ para el `darkMode` por selector de atributo), `postcss` y `autoprefixer` como devDependencies (`npm install -D tailwindcss@^3.4.0 postcss autoprefixer`) y crear `postcss.config.js` en la raíz con `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.
- [X] T002 [deps:T001] [codex-medium] Crear `tailwind.config.ts` en la raíz siguiendo research.md Decisiones 2-5 al pie de la letra: `content` con glob amplio (`./src/**/*.{ts,tsx}`); `darkMode: ["selector", '[data-theme="dark"]']`; `corePlugins: { preflight: false }`; `theme.extend.colors` mapeando `bg`, `surface`, `text`, `muted`, `border`, `accent`, `accent-soft`, `danger`, `ok` a sus `var(--...)` correspondientes de `src/app/globals.css`.
- [X] T003 [deps:T002] [codex-low] Agregar `@tailwind base; @tailwind components; @tailwind utilities;` como las primeras tres líneas de `src/app/globals.css` (antes de cualquier regla existente, sin borrar ni reordenar nada más). Correr `npm run build` para confirmar que Tailwind y PostCSS están bien integrados al build de Next.js ANTES de tocar ningún componente (sanity check: sin componentes usando clases de Tailwind todavía, el build debe pasar igual que antes).

**Checkpoint**: Tailwind instalado, configurado contra los tokens reales, y probado con un build limpio.

---

## Phase 2: Infraestructura compartida — Dialog.tsx

**Purpose**: Restylear el componente modal compartido, único archivo fuera de Sectores tocado en esta
feature (excepción acordada en Clarify). Necesario antes de US1 porque `CreateSectorDialog` lo usa.

- [X] T004 [deps:T003] [claude-sonnet] Restylear `src/components/ui/Dialog.tsx` con Tailwind: mismo marco modal sobre `<dialog>` nativo, mismo comportamiento de `showModal()`/`close()`/backdrop-click, sin cambiar su API (`open`, `onClose`, `title`, `children`). Este cambio afecta el marco de TODOS los diálogos de la app, no solo los de Sectores — eso es lo esperado (FR-011, excepción acordada en Clarify 2026-07-12).

**Checkpoint**: `Dialog.tsx` restyleado y probado (abrir cualquier diálogo existente de la app, confirmar que el marco cambia pero el contenido/comportamiento no).

---

## Phase 3: User Story 1 - Escanear el estado de los sectores de un vistazo (Priority: P1) 🎯 MVP

**Goal**: La lista de sectores (grilla) y el diálogo de creación se ven con el nuevo lenguaje visual: borde fino, badge de ámbito con punto, barra de progreso fina, mismos colores de siempre.

**Independent Test**: Entrar a `/sectors` en grilla, claro y oscuro, y comparar contra el mockup aprobado.

### Implementation for User Story 1

- [X] T005 [US1] [deps:T003] [claude-sonnet] Restylear `src/components/sectors/SectorCard.tsx` con clases de Tailwind (usando los tokens mapeados en T002: `bg-surface`, `text-muted`, `border-border`, `text-accent`, etc.): tarjeta con borde de 1px sin sombra, kicker de ámbito en mayúscula chica arriba del nombre, nombre con peso semibold, badge de ámbito como píldora con punto de color (acento para Global, color propio del sector o neutro para el resto), barra de progreso de ~4px con esquinas redondeadas, números de progreso en fuente monoespaciada tabular. No tocar todavía la lógica de `scope`/`metrics` ni el `href` del `Link`.
- [X] T006 [US1] [deps:T005] [claude-sonnet] Restylear `src/components/sectors/SectorsView.tsx` (buscador, barra de herramientas, toggle grilla/tabla, estados de carga/vacío) y su envoltorio `src/app/(main)/sectors/page.tsx` con Tailwind, para que convivan visualmente con la tarjeta ya restyleada en T005. No cambiar la lógica de filtro/orden existente.
- [X] T007 [US1] [deps:T004] [claude-sonnet] Restylear `src/components/sectors/CreateSectorDialog.tsx` (labels, inputs, selector de ámbito, botones) con Tailwind, usando el `Dialog.tsx` ya restyleado en T004 como contenedor. Mismo comportamiento (selector Personal/Grupo/Global, validación de nombre, `POST /api/sectors`) sin cambios de lógica.

**Checkpoint**: US1 completa y verificable de forma independiente (lista + tarjeta + diálogo de creación con el nuevo lenguaje visual).

---

## Phase 4: User Story 2 - Ver el ámbito del sector también en la vista de tabla (Priority: P2)

**Goal**: La vista de lista/tabla muestra el mismo badge de ámbito que la grilla.

**Independent Test**: Cambiar el toggle de vista a "lista" en `/sectors` y confirmar que el ámbito de cada sector sigue visible en cada fila.

### Implementation for User Story 2

- [X] T008 [P] [US2] [deps:T006] [codex-medium] En `src/components/sectors/SectorsView.tsx`, agregar el mismo badge de ámbito con punto de color (mismo tratamiento visual que T005) a cada fila de la vista de tabla, que hoy solo muestra nombre/progreso/tareas sin el ámbito.

**Checkpoint**: US2 verificada de forma independiente (T006 + T008).

---

## Phase 5: User Story 3 - Distinguir un sector recién creado de uno con datos ocultos (Priority: P2)

**Goal**: Un sector sin tareas muestra una nota explícita en vez de ocultar el bloque de progreso.

**Independent Test**: Con un sector sin ninguna tarea asignada, confirmar que su tarjeta muestra una nota en vez de un espacio vacío.

### Implementation for User Story 3

- [X] T009 [P] [US3] [deps:T005] [codex-medium] En `src/components/sectors/SectorCard.tsx`, cuando `metrics.total === 0`, mostrar una nota (p. ej. "Sin tareas todavía") en el lugar donde iría la barra de progreso, en vez de ocultar ese bloque por completo como hace hoy la condición `metrics.total > 0`.

**Checkpoint**: US3 verificada de forma independiente (T005 + T009).

---

## Phase 6: User Story 4 - El detalle de un sector se ve igual de renovado (Priority: P3)

**Goal**: El detalle de sector (página completa) usa el mismo lenguaje visual, sin perder ninguna función.

**Independent Test**: Entrar al detalle de un sector con tareas propias, agrupadas por trabajo y referencias; confirmar visual consistente y que cada función (color, menú, toggle, crear tarea, Referencias) sigue funcionando.

### Implementation for User Story 4

- [X] T010 [US4] [deps:T003] [claude-sonnet] Restylear `src/app/(main)/sectors/[id]/page.tsx` completo con Tailwind: header (color editable/dot de solo lectura, nombre, badge de ámbito), menú de acciones ("Estados de tarea", "Eliminar sector"), segmented toggle lista/tablero, sección de tareas (sueltas + agrupadas por trabajo), sección "Referencias". CUIDADO: preservar exactamente toda la lógica condicional existente (gate por `canOperate`, flujo de confirmación al eliminar con `affectedTasks`/`looseTasks`, panel de `TaskStatusSettings`) — es un cambio de estilo únicamente, no tocar `TaskListEditor`, `TaskItem`, `TaskBoardView` ni `TaskStatusSettings` (solo su contenedor visual).

**Checkpoint**: Las 4 historias quedan verificadas de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final cruzada a toda la feature.

- [X] T011 [P] [deps:T004,T005,T006,T007,T008,T009,T010] [claude-haiku] Correr `npm run lint` sobre los archivos tocados (`SectorCard.tsx`, `SectorsView.tsx`, `sectors/page.tsx`, `CreateSectorDialog.tsx`, `Dialog.tsx`, `sectors/[id]/page.tsx`, `tailwind.config.ts`, `postcss.config.js`, `globals.css`) y corregir lo que reporte.
- [X] T012 [deps:T004,T005,T006,T007,T008,T009,T010] [claude-sonnet] Correr `npm run build` (confirma que Tailwind sigue integrado correctamente al build completo) y `npm test` (confirma que ninguna suite existente se rompió — esta feature no debería tocar lógica cubierta por tests).
- [ ] T013 [deps:T011,T012] [claude-sonnet] Ejecutar manualmente los 3 escenarios de `quickstart.md` (lista/tarjeta en claro y oscuro, diálogo compartido dentro y fuera de Sectores, detalle completo con cada función) contra el servidor de desarrollo, y verificar SC-002 comparando al menos 3 pantallas fuera de Sectores (por ejemplo `/works`, `/groups`, `/admin/task-statuses`) contra su apariencia previa a esta feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: T001 → T002 → T003, estrictamente secuencial (mismo archivo/config encadenado). Bloquea TODO lo demás.
- **Infra compartida (Phase 2)**: T004 depende de T003; bloquea T007 (US1).
- **User Stories (Phase 3-6)**: dependen de T003 (algunas transitivamente vía T005/T006). T007 (US1, diálogo de creación) además depende de T004. T008 (US2) depende de T006. T009 (US3) depende de T005. T010 (US4) es independiente de las demás historias salvo T003.
- **Polish (Phase 7)**: depende de que todas las tareas de implementación estén completas.

### Parallel Opportunities

- T005 (SectorCard) y T004 (Dialog.tsx) pueden correr en paralelo una vez completo T003 (archivos distintos, sin dependencia cruzada).
- T008 (US2) y T009 (US3) pueden correr en paralelo entre sí una vez completos T006 y T005 respectivamente (ediciones puntuales en secciones distintas de `SectorsView.tsx`/`SectorCard.tsx` — si el agente detecta conflicto real de líneas, avisar en vez de forzar el merge).
- T010 (US4, detalle) puede correr en paralelo a toda la Fase 3/4/5 una vez completo T003 (archivo totalmente distinto).

## Parallel Example: tras Foundational

```bash
# En paralelo apenas T003 está listo:
Task: "T004 — restyle Dialog.tsx (infra compartida)"
Task: "T005 — restyle SectorCard.tsx (US1)"
Task: "T010 — restyle sectors/[id]/page.tsx (US4)"

# Encadenados a T004/T005/T006:
Task: "T006 — restyle SectorsView.tsx + page.tsx (depende de T005)"
Task: "T007 — restyle CreateSectorDialog.tsx (depende de T004)"
Task: "T008 — badge en tabla (depende de T006)"
Task: "T009 — nota de estado vacío (depende de T005)"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Foundational (T001-T003).
2. T004 (Dialog.tsx) en paralelo con T005 → T006 (US1).
3. T007 (diálogo de creación, depende de T004).
4. **STOP and VALIDATE**: comparar `/sectors` en grilla contra el mockup aprobado, y probar crear un sector.

### Incremental Delivery

1. Foundational → Tailwind listo y probado con un build limpio.
2. Infra compartida (T004) + US1 (T005, T006, T007) → lista, tarjeta y creación completas.
3. US2 (T008) y US3 (T009) en paralelo → correcciones de la auditoría.
4. US4 (T010) → detalle completo, en paralelo a lo anterior si hay capacidad.
5. Polish (T011-T013) → lint, build+test, verificación manual completa incluyendo SC-002.

## Notes

- Esta feature no toca el modelo de datos ni agrega tests nuevos — mantiene el alcance mínimo pedido.
- `Dialog.tsx` (T004) es la única excepción documentada a "no tocar nada fuera de Sectores" — confirmado en Clarify y reflejado en FR-011/FR-012/SC-002 de spec.md.
- El resto de `globals.css` (4266 líneas) no se toca ni se borra — sigue sirviendo a toda la app no migrada todavía.

## Corrección de rumbo post-T013 (2026-07-12)

La primera pasada de T005/T006/T007/T009/T010 implementó un lenguaje visual nuevo (estilo Vercel/Tailwind).
El usuario lo vio en el navegador y pidió revertirlo: el resultado debe verse **igual que antes de esta
feature**, solo migrado a Tailwind (ver Clarify "corrección de rumbo" en spec.md). Se reescribieron a mano
`SectorCard.tsx`, `SectorsView.tsx`, `sectors/page.tsx` y se ajustó `sectors/[id]/page.tsx`, usando los
valores exactos de las clases CSS originales (`.project-card`, `.pc-name-pill`, `.pc-scope-pill`,
`.pc-progress-*`, `.segmented`) traducidos a Tailwind — incluyendo arbitrary values `[var(--...)]` para
preservar colores/radios/sombras exactos donde no hay utilidad estándar equivalente. `Dialog.tsx` (T004) y
`CreateSectorDialog.tsx` (T007) ya coincidían de entrada con el diseño original y no necesitaron revertirse,
solo un fix de sombra (ver abajo). Se mantuvieron las dos correcciones de auditoría aprobadas por el usuario
(US2: badge de ámbito en tabla; US3: nota de estado vacío), adaptadas al estilo plano original.

**Bug 1 encontrado y corregido en la re-verificación**: `shadow-[var(--shadow-md)]` (sintaxis de valor
arbitrario de Tailwind) no genera ningún `box-shadow` — Tailwind lo interpreta como si el contenido del
corchete fuera un *color* de sombra, no el shorthand completo, así que `box-shadow` queda en `none`. Afectaba
a `SectorCard.tsx`, `SectorsView.tsx`, `CreateSectorDialog.tsx` y `Dialog.tsx`. Corregido reemplazando por la
sintaxis de propiedad arbitraria completa: `[box-shadow:var(--shadow-md)]`. Verificado con
`getComputedStyle` tras el fix.

**Bug 2 (grave, afectaba TODA la app, no solo Sectores) encontrado y corregido**: el fix de T003 para que la
utilidad `border` de Tailwind dibujara algo (`*, ::before, ::after { border-style: solid; }`, necesario
porque `corePlugins.preflight` está desactivado) estaba incompleto — le faltaba `border-width: 0`. El valor
inicial CSS de `border-width` no es `0`, es la palabra clave `medium` (~1.5-3px según el motor), invisible
solo mientras `border-style` es `none` (su propio valor inicial). Al activar `border-style: solid`
globalmente sin también fijar `border-width: 0`, TODO elemento del sitio sin un ancho de borde explícito
pasó a mostrar un borde `medium` visible en su propio color de texto (`currentColor`) — se veía como bordes
negros/gruesos alrededor de pills, tarjetas y botones en cualquier pantalla, no solo Sectores. Detectado
porque el usuario lo vio en capturas de `/sectors` y lo señaló; confirmado con `getComputedStyle` directo
sobre el DOM (`border-width: 1.5px` en elementos sin ninguna clase de borde) antes del fix, y `border-width:
0px` después. Corregido agregando `border-width: 0;` junto a `border-style: solid;` en el mismo bloque de
`globals.css` — es exactamente el par de declaraciones que trae el Preflight real de Tailwind para esto.
