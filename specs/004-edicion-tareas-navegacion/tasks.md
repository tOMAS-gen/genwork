# Tasks: Edición inline de tareas y navegación mejorada

**Input**: Design documents from `/specs/004-edicion-tareas-navegacion/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/delta.md, research.md, quickstart.md

**Tests**: Lógica pura nueva (`toTagForm`/`tagMatchesName` + resolución tolerante) con tests
obligatorios por constitution. El resto UI, verificada vía quickstart.md.

**Organization**: Por user story. Sin deps nuevas ni migraciones. Prioridad funcionalidad >
estética (pedido del usuario).

## Format: `[ID] [P?] [Story?] [modelo] Description`

- **[P]**: paralelizable | **[Story]**: US1..US4 | **[modelo]**: haiku | sonnet | opus

## Path Conventions

Proyecto Next.js existente: `src/`, tests en `tests/unit/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Matching tolerante (lo usan US1 y US2) + hook compartido de autocompletado

- [X] T001 [sonnet] Crear `toTagForm(name)` y `tagMatchesName(tag, name)` (espacio ≡ guion, canónico sobre normalizeTagName, colapso de separadores) + `matchByTag(tag, names)` con fallback de prefijo único (1 candidato→match; 0 o 2+→null) en src/lib/domain/tags/matching.ts
- [X] T002 [P] [sonnet] Tests de matching: espacios≡guiones, acentos/mayúsculas, prefijo único, prefijo ambiguo (2 candidatos→null), toTagForm con símbolos, nombres de una palabra intactos, en tests/unit/tag-matching.test.ts
- [X] T003 [sonnet] Extraer hook compartido `useTagAutocomplete` (detección trigger /#@ con regex actual, fetch a /api/tags/suggest, selección, inserción usando `insertText` de la sugerencia) desde la lógica duplicada de TaskListEditor/TaskInput, en src/components/tasks/useTagAutocomplete.ts (sin cambiar comportamiento todavía)

**Checkpoint**: dominio del matching testeado + hook listo

---

## Phase 2: User Story 2 - Direccionar a otro proyecto desde un proyecto (Priority: P2, va primero: arregla el bug base) 

**Goal**: `/otro-proyecto` funciona desde el bloc del proyecto (nombres con espacios incluidos), con aviso "Tarea enviada a /X"

**Independent Test**: Quickstart §US2 — autocompletar "Obra Escuela Norte" desde Tina, la tarea se va a Obra con aviso; `/obra-escuela-norte` a mano resuelve; prefijo ambiguo pide corregir

- [X] T004 [US2] [sonnet] Resolución tolerante en el server: reemplazar las comparaciones de igualdad exacta de nombres (works, sectores y usuarios) por `tagMatchesName` + fallback `matchByTag` de prefijo único, en src/server/tasks.ts (resolveTask)
- [X] T005 [US2] [sonnet] Suggest tolerante + insertText: usar tagMatchesName/prefijo para el filtrado y agregar campo `insertText: toTagForm(name)` a cada sugerencia en src/app/api/tags/suggest/route.ts
- [X] T006 [P] [US2] [sonnet] Componente Toast (portal, auto-dismiss 5 s, aria-live=polite, enlace opcional, no roba foco) en src/components/ui/Toast.tsx + estilos .toast en src/app/globals.css
- [X] T007 [US2] [sonnet] Migrar TaskListEditor y TaskInput al hook useTagAutocomplete (inserción con insertText) y disparar Toast "Tarea enviada a /{nombre}" (con enlace si la respuesta trae work distinto del contexto) en src/components/tasks/TaskListEditor.tsx y src/components/tasks/TaskInput.tsx

**Checkpoint**: bug de `/proyecto` resuelto end-to-end con feedback

---

## Phase 3: User Story 1 - Edición inline estilo Notion (Priority: P1)

**Goal**: tocar el texto de una tarea la edita en el lugar (proyecto y sector); Enter/blur guarda re-parseando; Esc cancela; vacía no se guarda

**Independent Test**: Quickstart §US1 — corregir tipeo al toque; agregar #sector editando; Escape descarta; suelta de sector + /Tina se muda con aviso; solo lectura no edita

- [X] T008 [US1] [sonnet] Componente TaskInlineEdit: input con rawText autoenfocado, autocompletado vía useTagAutocomplete, Enter/blur guarda con PATCH /api/tasks/{id}, Escape cancela, texto vacío restaura sin guardar, 409 unresolvedTags muestra el panel "crear o corregir" (reusar patrón existente), en src/components/tasks/TaskInlineEdit.tsx
- [X] T009 [US1] [sonnet] Integrar modo edición en TaskItem: click en el texto (no en la casilla/etiquetas) entra en edición si `canToggle` (editable); tareas realizadas también editables; aviso "Tarea enviada a /X" si el PATCH devuelve work distinto del contexto, en src/components/tasks/TaskItem.tsx
- [X] T010 [P] [US1] [haiku] Estilos del modo edición (input sin borde ocupando la fila, foco visible, transición 150ms) en src/app/globals.css
- [X] T011 [US1] [sonnet] Verificar la mudanza de tarea suelta de sector al agregarle /proyecto en edición: debe conservar TaskLink EXEC al sector hogar (regla FR-038 de la 001); ajustar saveTask si el EXEC no se preserva al pasar de sectorId→workId, en src/server/tasks.ts

**Checkpoint**: tareas editables al toque en proyecto y sector

---

## Phase 4: User Story 3 - Dashboard con drawer colapsable (Priority: P3)

**Goal**: el board (no Lector) usa el drawer real de la app; drawer ocultable con botón; sin hamburguesa flotante; Lector limpio

**Independent Test**: Quickstart §US3 — board con drawer; ocultar→pantalla completa+botón discreto; estado persiste; Lector sin nada

- [X] T012 [US3] [sonnet] Colapso global del drawer: estado en localStorage (gw:drawer-collapsed), botón de ocultar en el header del drawer (ícono PanelLeftClose) y botón fijo discreto para reabrir (PanelLeft, esquina sup. izq.), aplicado al shell en src/app/(main)/layout.tsx (+ wrapper cliente si hace falta) y estilos .shell colapsado en src/app/globals.css
- [X] T013 [US3] [sonnet] Integrar el board al shell con drawer para roles no-Lector y eliminar BoardNav (borrar src/components/nav/BoardNav.tsx y su uso): mover/renderizar el dashboard dentro del layout autenticado manteniendo para READER la vista limpia actual sin shell, en src/app/board/page.tsx (y layout que corresponda)

**Checkpoint**: dashboard integrado; TV limpia on-demand

---

## Phase 5: User Story 4 - Drawer: grupos, ícono, tema (Priority: P4)

**Goal**: Grupos expandibles, ícono en Administración, tema claro/oscuro/sistema persistente

**Independent Test**: Quickstart §US4 — sublista de grupos navegable; ícono admin; tema oscuro persiste; modo sistema cambia en vivo; sin FOUC

- [X] T014 [US4] [sonnet] DrawerNav: "Grupos" como sublista expandible (datos de /api/groups, tope 10 + "ver todos", refresco con useLiveRefresh) e ícono Settings en "Administración", en src/components/nav/DrawerNav.tsx
- [X] T015 [US4] [sonnet] Tema oscuro: bloque `[data-theme="dark"]` en globals.css redefiniendo tokens (--bg, --surface, --text, --muted, --border, --accent-soft, fondos de .tag-*, .card, .menu-pop, dialog, board) con contraste AA + `color-scheme`, en src/app/globals.css
- [X] T016 [US4] [sonnet] ThemeToggle (claro/oscuro/sistema con íconos Sun/Moon/Monitor, persiste en gw:theme, aplica data-theme, escucha prefers-color-scheme en modo sistema) al pie del drawer + script inline anti-FOUC en el <head> del layout raíz, en src/components/ui/ThemeToggle.tsx, src/components/nav/DrawerNav.tsx y src/app/layout.tsx

**Checkpoint**: drawer completo con tema

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] [haiku] Repaso de contraste del tema oscuro en pantallas clave (login, home, proyecto, sector, board, admin): texto ≥4.5:1, etiquetas y estados legibles; corregir tokens si algo no llega, en src/app/globals.css
- [X] T018 [sonnet] Ejecutar quickstart.md completo (US1-US4 + regresión) en modo dev, corregir detalles menores encontrados

---

## Dependencies

```text
Foundational (T001-T003) → US2 (T004-T007) → US1 (T008-T011)
Foundational → US3 (T012-T013) → US4 (T014-T016) → Polish
```

- US2 antes que US1: la edición inline reusa el matching arreglado + el hook + el Toast.
- US3 y US4 tocan DrawerNav/layout: secuenciales entre sí; independientes de US1/US2 salvo estilos.
- T002 [P] con T001 tras fijar firma; T006 [P] (archivo nuevo); T010 [P] (solo CSS).

## Parallel Execution Examples

- T002 en paralelo con T003 (archivos distintos).
- T006 (Toast) en paralelo con T004-T005 (server).
- T010 (CSS) en paralelo con T008-T009.

## Implementation Strategy

1. **Base = T001-T007**: bug de `/proyecto` arreglado con feedback (valor inmediato).
2. **Incremento 2 = US1 (T008-T011)**: edición inline (el pedido central).
3. **Incremento 3 = US3+US4 (T012-T016)**: navegación + tema.
4. **Polish**: contraste + quickstart.

## Resumen de etiquetas de modelo

- **haiku** (2): T010, T017 — CSS mecánico.
- **sonnet** (16): resto — componentes, hook, server, tema.
- **opus** (0): sin lógica riesgosa (el matching es puro y testeado; sin auth/datos/concurrencia).
