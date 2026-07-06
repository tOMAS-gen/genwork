# Tasks: Sector Personal, Notas y Google Auth

**Input**: Design documents from `specs/015-personal-notes-google-auth/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Organization**: Tasks grouped by user story. No tests requested.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = Sector personal con notas, US2 = Admin visual, US3 = Avatar Google
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] complejo/riesgoso

---

## Phase 1: Setup

**Purpose**: Instalar dependencias nuevas necesarias para el editor rich-text.

- [x] T001 [haiku] Instalar dependencias TipTap: `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder`

---

## Phase 2: Foundational

**Purpose**: Migración de base de datos — modelo Note + campo User.image. Bloquea todas las user stories.

- [x] T002 [opus] Crear migración Prisma 0005_personal_notes: agregar modelo Note (id, title, content Json?, userId FK, createdAt, updatedAt) con index (userId, updatedAt) y agregar campo `image String?` al modelo User en prisma/schema.prisma y prisma/migrations/0005_personal_notes/

**Checkpoint**: Schema actualizado, migración aplicada, Prisma client regenerado.

---

## Phase 3: User Story 1 — Sector personal con notas (Priority: P1) 🎯 MVP

**Goal**: Cada usuario tiene un espacio personal con notas rich-text accesible desde el sidebar.

**Independent Test**: Iniciar sesión → ver "Mis notas" en sidebar → crear nota con formato → navegar fuera y volver → la nota persiste.

### Implementation for User Story 1

- [x] T003 [P] [US1] [sonnet] Crear API routes para notas: GET (listar por userId, ordenadas por updatedAt DESC) y POST (crear nota vacía) en src/app/api/notes/route.ts
- [x] T004 [P] [US1] [sonnet] Crear API routes para nota individual: GET (obtener), PATCH (actualizar título/content — autoguardado), DELETE (eliminar) en src/app/api/notes/[id]/route.ts
- [x] T005 [US1] [sonnet] Crear componente NoteEditor con TipTap: toolbar con botones de formato (H1/H2/H3, bold, italic, lista, link), campo de título editable, autoguardado con debounce de 1.5s en src/components/notes/NoteEditor.tsx
- [x] T006 [US1] [sonnet] Crear componente NoteList: lista de notas con título, preview de contenido truncado, fecha de modificación, botón nueva nota y botón eliminar con confirmación en src/components/notes/NoteList.tsx
- [x] T007 [US1] [sonnet] Crear página de notas /notes: usar NoteList, layout con sheet-title "Mis notas", EmptyState cuando no hay notas en src/app/(main)/notes/page.tsx
- [x] T008 [US1] [sonnet] Crear página de editor /notes/[id]: breadcrumbs (Mis notas / Título), NoteEditor con la nota cargada, autoguardado activo en src/app/(main)/notes/[id]/page.tsx
- [x] T009 [US1] [sonnet] Agregar enlace "Mis notas" al sidebar en DrawerNav.tsx: ícono StickyNote (lucide), ubicado antes de la sección PROYECTOS, con estilo destacado en src/components/nav/DrawerNav.tsx
- [x] T010 [US1] [sonnet] Agregar estilos CSS para el editor TipTap: toolbar, contenido editable, placeholder, estilos de tipografía dentro del editor, compatibilidad dark mode en src/app/globals.css

**Checkpoint**: Notas funcionales con editor rich-text, accesibles desde sidebar. Autoguardado operativo.

---

## Phase 4: User Story 2 — Admin con estilo visual consistente (Priority: P2)

**Goal**: La página /admin usa el mismo design system que el resto del sitio.

**Independent Test**: Navegar a /admin → las secciones se ven como tarjetas project-card con tipografía e íconos consistentes.

### Implementation for User Story 2

- [x] T011 [US2] [sonnet] Rediseñar /admin: usar clase `sheet` con `sheet-title`, cada sección como tarjeta `project-card` con ícono de lucide, nombre en negrita y descripción muted. Layout con `project-grid` en src/app/(main)/admin/page.tsx
- [x] T012 [US2] [sonnet] Verificar responsive mobile y dark mode en /admin. Ajustar CSS si hay inconsistencias en src/app/globals.css

**Checkpoint**: Admin visualmente idéntico al resto del sitio en desktop, mobile y dark mode.

---

## Phase 5: User Story 3 — Avatar de Google en sidebar (Priority: P3)

**Goal**: El sidebar muestra avatar circular con foto de Google y nombre del usuario.

**Independent Test**: Iniciar sesión → ver avatar y nombre en el sidebar antes de PROYECTOS.

### Implementation for User Story 3

- [x] T013 [US3] [opus] Modificar callback de signIn en auth.ts para persistir `profile.picture` como `image` en el modelo User. Extender la interfaz de Session para incluir `image`. Actualizar el callback jwt/session para pasar `image` en src/server/auth.ts
- [x] T014 [US3] [sonnet] Agregar sección de perfil de usuario al sidebar: avatar circular (img con fallback a iniciales sobre fondo de color), nombre del usuario, ubicado antes de la sección PROYECTOS en src/components/nav/DrawerNav.tsx
- [x] T015 [US3] [sonnet] Agregar estilos CSS para avatar: círculo 36px, object-fit cover, borde sutil, fallback con iniciales centradas. Responsive en mobile en src/app/globals.css

**Checkpoint**: Avatar + nombre visible en sidebar para usuarios con y sin foto.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Verificación final y limpieza

- [x] T016 [sonnet] Ejecutar validación completa: verificar /notes, /notes/[id], /admin en desktop, mobile (375px), tema claro y oscuro
- [x] T017 [haiku] Verificar que el seed de desarrollo (prisma/seed.ts) sigue funcionando correctamente con el nuevo modelo Note

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — instalar deps
- **Phase 2 (Foundational)**: Depende de Phase 1 — migración bloquea todo
- **US1 (Phase 3)**: Depende de Phase 2 — T003 y T004 en paralelo, luego T005-T010 secuencial
- **US2 (Phase 4)**: Independiente de US1 — solo necesita Phase 2 (pero no usa Note model, así que técnicamente puede empezar antes)
- **US3 (Phase 5)**: Depende de Phase 2 (campo User.image) — independiente de US1 y US2
- **Polish (Phase 6)**: Después de US1-US3

### Parallel Opportunities

- T003 y T004 pueden ejecutarse en paralelo (API routes distintas)
- T011 (admin) es independiente de T003-T010 (notas) — pueden ejecutarse en paralelo
- T013-T015 (avatar) son independientes de T003-T010 (notas)

### Parallel Example

```bash
# Después de Phase 2, tres tracks paralelos:
Track A (US1): T003+T004 → T005 → T006 → T007 → T008 → T009 → T010
Track B (US2): T011 → T012
Track C (US3): T013 → T014 → T015
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Completar Phase 1-2 → deps + migración
2. Completar Phase 3 → notas funcionales
3. **VALIDAR**: /notes con editor, autoguardado, CRUD completo
4. Seguir con US2 y US3

### Incremental Delivery

1. US1 (Notas) → validar → ✓
2. US2 (Admin) → validar → ✓
3. US3 (Avatar) → validar → ✓
4. Polish → validar → ✓

---

## Notes

- TipTap es la única dependencia nueva
- Google auth ya funciona — solo falta persistir la imagen
- Admin solo necesita cambio de clases CSS (no lógica nueva)
- Total: 17 tareas (haiku: 2, sonnet: 13, opus: 2)
