# Tasks: Mejoras de experiencia — Proyectos estilo Notion y navegación

**Input**: Design documents from `/specs/002-mejoras-ux-proyectos/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: Solo la lógica pura nueva (`splitTaskLines`) lleva test obligatorio por constitution.
El resto es UI, verificada manualmente vía quickstart.md.

**Organization**: Tareas por user story. Feature sobre la 001 ya implementada; el renombre (US1)
va primero porque toca todos los textos que las demás historias reusan.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1..US5 según spec.md

## Path Conventions

Proyecto Next.js existente: código en `src/`, tests en `tests/`, Prisma en `prisma/`. Base
visual: `design-system/genwork/MASTER.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencias, tokens visuales y migración de datos que habilitan todo lo demás

- [X] T001 Instalar dependencias nuevas: `lucide-react` y `@tiptap/extension-placeholder` (npm install)
- [X] T002 Aplicar el design system a src/app/globals.css: `@import` de Inter, variables de color/espaciado/sombra del MASTER.md, transiciones 150-200ms, foco visible, `prefers-reduced-motion`; ajustar clases base (.btn, .card, .input) a los tokens
- [X] T003 Agregar `description String?` a `Work` en prisma/schema.prisma y generar migración (prisma migrate dev --name work_description)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Componentes UI reutilizables + wrappers de íconos que usan varias historias

**⚠️ CRITICAL**: US2/US4/US5 dependen de estos componentes

- [X] T004 [P] Wrappers de íconos Lucide (Plus, MoreVertical, ChevronRight, ChevronDown, Paperclip, Menu, X, Trash2, Archive) en src/components/ui/icons.tsx
- [X] T005 [P] Componente Dialog accesible con `<dialog>` nativo (showModal, Esc cierra, scrim, retorno de foco, slot de error interno) en src/components/ui/Dialog.tsx
- [X] T006 [P] Componente Menu (⋮) accesible: botón + popover, navegación por teclado (flechas/Esc), click-fuera cierra, aria-haspopup en src/components/ui/Menu.tsx

**Checkpoint**: Piezas de UI listas para las historias

---

## Phase 3: User Story 1 - Terminología "Proyectos" (Priority: P1)

**Goal**: Toda la UI dice "Proyecto(s)"; modelo/rutas/API sin cambios

**Independent Test**: Recorrer todas las pantallas; cero "Trabajo/Trabajos" como nombre de la unidad

- [X] T007 [US1] Renombrar textos a "Proyecto(s)" en la navegación y el home: src/app/(main)/layout.tsx y src/app/(main)/page.tsx (menú, títulos, placeholders, botones)
- [X] T008 [P] [US1] Renombrar textos en la página de proyecto y sus componentes: src/app/(main)/works/[id]/page.tsx, src/components/works/ArchiveDialog.tsx
- [X] T009 [P] [US1] Renombrar textos en sectores, grupos y admin donde se menciona "trabajo": src/app/(main)/sectors/**, src/app/(main)/groups/**, src/app/(main)/admin/** (solo cadenas visibles; sin tocar rutas ni llamadas API)
- [X] T010 [P] [US1] Ajustar textos de ayuda del autocompletado y mensajes de tareas que dicen "trabajo" → "proyecto" en src/components/tasks/TaskInput.tsx y src/components/tasks/TaskItem.tsx (el símbolo `/` no cambia)

**Checkpoint**: Terminología unificada

---

## Phase 4: User Story 2 - Crear proyecto con botón + y diálogo (Priority: P2)

**Goal**: Botón + → diálogo con ámbito/nombre/descripción; crea y navega; errores dentro del diálogo

**Independent Test**: Quickstart §US2 — crear con descripción, ver en tarjeta y página; cancelar no crea; duplicado muestra error sin perder lo escrito

- [X] T011 [US2] Extender API works con `description`: POST y PATCH aceptan/validan `description` (≤280), GET lo devuelve, en src/app/api/works/route.ts y src/app/api/works/[id]/route.ts (Zod)
- [X] T012 [US2] Componente CreateProjectDialog (selector ámbito Para mí/grupos donde puede crear, nombre, descripción; error interno; al confirmar navega al proyecto) en src/components/projects/CreateProjectDialog.tsx usando Dialog
- [X] T013 [US2] Home: reemplazar el formulario inline por botón "+" (ícono Plus) que abre CreateProjectDialog; mostrar la descripción en cada tarjeta del listado en src/app/(main)/page.tsx

**Checkpoint**: Creación por diálogo con descripción

---

## Phase 5: User Story 3 - Página de proyecto estilo Notion (Priority: P3)

**Goal**: Hoja sin cajas (título grande, descripción, documento fluido) + sección Tareas tipo bloc de notas (Enter crea, sigue el foco)

**Independent Test**: Quickstart §US3 — cargar 3 tareas solo con teclado; una con `#sector` queda etiquetada; pegar multilínea crea una por línea no vacía

- [X] T014 [P] [US3] Lógica pura `splitTaskLines(text)` (descarta vacías/espacios; una tarea por línea) en src/lib/domain/tasks/multiline.ts
- [X] T015 [P] [US3] Tests de splitTaskLines (líneas vacías, espacios, pegado multilínea, texto simple) en tests/unit/multiline.test.ts
- [X] T016 [US3] Reestilar DocEditor como hoja Notion: sin borde de caja, ancho de lectura ~720px, título/tipografía Inter, extensión Placeholder ("Escribí acá…") en src/components/editor/DocEditor.tsx
- [X] T017 [US3] Componente TaskListEditor (bloc de notas: fila de captura al pie, Enter crea vía POST /api/tasks y mantiene el foco, autocompletado `#`/`@`/`/` reusado de TaskInput, pegado multilínea usa splitTaskLines) en src/components/tasks/TaskListEditor.tsx
- [X] T018 [US3] Rearmar la página de proyecto como hoja única (título grande + descripción + DocEditor sin cajas + sección "Tareas" con TaskListEditor y la lista existente) en src/app/(main)/works/[id]/page.tsx

**Checkpoint**: Página Notion con carga de tareas en serie

---

## Phase 6: User Story 4 - Archivado en menú ⋮ (Priority: P4)

**Goal**: Acciones del proyecto en menú ⋮ junto al título; sin bloque de archivado al pie

**Independent Test**: Quickstart §US4 — ⋮ ofrece archivar (activos) / descargar+eliminar (archivados); el pie ya no tiene el bloque

- [X] T019 [US4] Componente ProjectMenu (⋮): usa Menu; para ACTIVE "Archivar…" (con condiciones), para ARCHIVED descargar paquete y eliminación definitiva; reutiliza el flujo/estado de ArchiveDialog sin cambiar su lógica en src/components/projects/ProjectMenu.tsx
- [X] T020 [US4] Integrar ProjectMenu junto al título en la página de proyecto y quitar el bloque de archivado del pie en src/app/(main)/works/[id]/page.tsx (refactor de ArchiveDialog a diálogo disparado desde el menú)

**Checkpoint**: Hoja limpia; acciones en ⋮

---

## Phase 7: User Story 5 - Navegación: drawer con listas y vuelta desde el dashboard (Priority: P5)

**Goal**: Drawer con sublistas expandibles de proyectos/sectores (en vivo); board con navegación compacta salvo Lector

**Independent Test**: Quickstart §US5 — expandir y saltar a un proyecto sin pasar por el listado; volver del board en ≤2 toques; Lector sin navegación

- [X] T021 [US5] Componente DrawerNav: entradas "Proyectos" y "Sectores" expandibles (chevron), sublista de activos (tope 10 + "ver todos") desde /api/works y /api/sectors, refresco en vivo con useLiveRefresh en src/components/nav/DrawerNav.tsx
- [X] T022 [US5] Integrar DrawerNav en el layout autenticado reemplazando los enlaces planos en src/app/(main)/layout.tsx
- [X] T023 [US5] Componente BoardNav: menú plegado (Menu/hamburguesa) para volver/navegar, oculto si el rol es READER, en src/components/nav/BoardNav.tsx
- [X] T024 [US5] Integrar BoardNav en el dashboard manteniendo la vista limpia de TV en src/app/board/page.tsx

**Checkpoint**: Navegación completa

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T025 [P] Pasar la Pre-Delivery Checklist del design system en las pantallas tocadas: cero emojis como íconos, cursor-pointer, foco visible, contraste 4.5:1, responsive 375/768/1024/1440, sin scroll horizontal
- [X] T026 [P] Verificar accesibilidad de teclado end-to-end: diálogo (Esc/foco atrapado), menú ⋮ (flechas/Esc), bloc de notas (Enter/Shift), drawer (Tab)
- [X] T027 Ejecutar quickstart.md completo (US1–US5) en modo dev y corregir ajustes visuales menores

---

## Dependencies

```text
Setup (T001-T003) → Foundational (T004-T006) → US1 → US2 → US3 → US4
                                                       US1 → US5
```

- US1 (renombre) primero: sus textos los reusan las demás historias.
- US2 usa Dialog (T005) + la API de description (T011).
- US3 usa Placeholder (T001) y el POST de tareas existente; T014/T015 (lógica pura) en paralelo.
- US4 usa Menu (T006) y refactoriza el ArchiveDialog existente (no cambia su flujo).
- US5 usa icons (T004), useLiveRefresh y los endpoints existentes; independiente de US2-US4.
- Polish al final.

## Parallel Execution Examples

- **Foundational**: T004, T005, T006 en paralelo (archivos distintos).
- **US1**: T008, T009, T010 en paralelo tras T007.
- **US3**: T014 + T015 (lógica/test) en paralelo con el trabajo de UI T016.
- **Polish**: T025 y T026 en paralelo.

## Implementation Strategy

1. **Base = Setup + Foundational + US1**: tokens visuales, componentes UI y terminología correcta
   en todo el sistema. Ya se ve más profesional aunque el resto no esté.
2. **Incremento 2 = US2 + US3**: el cambio de experiencia grande (diálogo + hoja Notion + bloc de
   notas). Es el corazón de esta feature.
3. **Incremento 3 = US4 + US5**: menú ⋮ y navegación (pulido de flujo).
4. **Polish**: checklist de design system + accesibilidad + validación quickstart.
5. Cada checkpoint es demostrable con su Independent Test (quickstart).
