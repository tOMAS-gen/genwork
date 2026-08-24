# Tasks — 060 Sectores agrupados por ámbito

Orden pensado para que los pasos 1-4 sean verificables sin abrir el navegador, y para que T007 sea
un punto de corte seguro (la grilla ya queda usable aunque la lista siga plana).

## Phase 1 — Base

- [X] T001 [claude-haiku] En `src/lib/nav/drawerSort.ts`, exportar el collator español existente como
      `compareNameEs`, para que la vista de sectores no instancie un segundo `Intl.Collator`. Sin
      cambio de comportamiento.
- [X] T002 [P] [claude-haiku] En `src/components/ui/icons.tsx`, agregar `Globe` al re-export de
      lucide (lo usa el encabezado de la sección GLOBAL; el design system prohíbe emojis).

## Phase 2 — Lógica pura (US1, US3)

- [X] T003 [US1] [deps:T001] [claude-sonnet] Crear
      `src/components/sectors/groupSectorsByScope.ts` con `SectorSection`, `SectorSortKey`,
      `sectionDomId()` y `groupSectorsByScope()`. Orden canónico GLOBAL → grupos A-Z → PERSONAL,
      aplicado como desempate de todos los criterios; el criterio elegido ordena secciones y
      sectores. Guardas para `total === 0`, `groupId` ausente y `groupName` ausente.
- [X] T004 [US1] [deps:T003] [claude-sonnet] Crear `tests/unit/sectors-grouping.test.ts` cubriendo
      orden canónico, acentos, los cuatro criterios en ambos niveles, desempates, grupos homónimos,
      datos incompletos, no-mutación y `sectionDomId`. **`npm test` en verde antes de tocar UI.**

## Phase 3 — UI (US1, US2, US4)

- [X] T005 [P] [US1] [deps:T002] [claude-sonnet] En `src/app/(main)/sectors/page.tsx`, sumar
      `prisma.group.findMany({ select: { id, color } })` al `Promise.all` existente y pasar
      `groupColors` a `SectorsView`. La rama sin sesión pasa `{}`.
- [X] T006 [US1] [deps:T002,T003] [claude-sonnet] Crear
      `src/components/sectors/SectorSectionHeader.tsx`: chevron rotatorio, punto de color del grupo
      o ícono de ámbito, título en mayúsculas, conteo de sectores y `Badge` de pendientes. Exportar
      también `SECTION_HEADER_BUTTON_CLASS` con los resets que exige `preflight: false`.
- [X] T007 [US1,US2,US3,US4] [deps:T003,T005,T006] [claude-sonnet] En `SectorsView.tsx`: estado
      `collapsed` (persistido) + `collapsedInSearch` (efímero), lectura/escritura de
      `gw:sectors-sections-collapsed` con `try/catch` y poda, `sections` por `useMemo`, opción
      "Más pendientes" en el selector, botón "Contraer todo / Expandir todo", y render de la
      **grilla** por secciones.
- [X] T008 [US1] [deps:T007] [claude-sonnet] En `SectorsView.tsx`, render del **modo lista** con dos
      `<tbody>` por sección (encabezado + filas), `<th colSpan scope="colgroup">`, y reemplazo de
      `window.location.href` por `useRouter().push()`.
- [X] T009 [P] [deps:T007,T008] [claude-haiku] Quitar los indicadores de ámbito redundantes: el pill
      de `SectorCard.tsx` pasa a ser el `Badge` de pendientes del sector, y se elimina la columna
      "Ámbito" de la tabla (`TABLE_COLS = 3`).

## Phase 4 — Cierre

- [X] T010 [P] [deps:T006] [claude-haiku] Crear `tests/unit/sector-section-header.test.tsx` con
      `renderToString`, normalizando los marcadores `<!-- -->` que React intercala.
- [X] T011 [deps:T009,T010] [claude-haiku] `npm test`, `npm run lint` y `npx tsc --noEmit` sobre los
      archivos tocados.
- [X] T012 [deps:T011] [claude-sonnet] Verificación manual en `http://localhost:3010/sectors` según
      [quickstart.md](./quickstart.md), con revisión del usuario antes de commitear.

## Resultado

- `npm test`: **712 tests en verde** (79 archivos), de los cuales 29 son nuevos.
- `npm run lint`: sin hallazgos nuevos. El único error del repo (`no-this-alias` en
  `src/components/editor/slashCommand.ts`) es preexistente y ajeno a esta feature.
- `npx tsc --noEmit`: sin errores en los archivos tocados. Los que aparecen en
  `src/app/api/task-statuses/__tests__/` son preexistentes.
- Verificado en navegador: orden A-Z y por pendientes, filtrado, persistencia del plegado,
  `aria-expanded` / `aria-controls`, tema oscuro y ancho de 375px.

## Notas de ejecución

- **T004 falló dos veces por expectativas mal escritas, no por el código**: (a) el orden por
  progreso con empate entre GLOBAL y un grupo cae al orden canónico, que pone GLOBAL primero; (b)
  React intercala `<!-- -->` entre expresiones adyacentes, así que `(7)` llega al HTML como
  `(<!-- -->7<!-- -->)`. Ambas se corrigieron en el test.
- El entorno local estaba sin `node_modules` ni cliente de Prisma generado; 9 archivos de test
  fallaban por eso antes de tocar nada.
