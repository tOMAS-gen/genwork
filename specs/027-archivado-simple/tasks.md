# Tasks: Archivado Simple

**Input**: Design documents from `specs/027-archivado-simple/`

**Prerequisites**: plan.md, spec.md

**Tests**: No — cambio de UI y lógica simple, verificación visual.

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Foundational

**Purpose**: Habilitar archivado/desarchivado via PATCH en la API

- [x] T001 [sonnet] Agregar soporte para `status` en el endpoint PATCH de `src/app/api/works/[id]/route.ts`: aceptar `{ status: "ARCHIVED" | "ACTIVE" }` en el body, validar que el valor sea uno de los dos, y actualizar `work.status` via Prisma. No crear ni requerir ArchiveRecord.

**Checkpoint**: API acepta PATCH con status.

---

## Phase 2: User Story 1 - Archivar sin exportar (Priority: P1)

**Goal**: Reemplazar el diálogo complejo de archivado (ZIP/polling/descarga/confirmación) por un confirm simple.

**Independent Test**: Menú ⋮ de proyecto → Archivar → confirmar → proyecto desaparece de vista activa.

- [x] T002 [US1] [sonnet] Simplificar la lógica de archivado en `src/components/projects/ProjectMenu.tsx`: Para proyectos ACTIVE, reemplazar todo el flujo de archivado (diálogo con fases BUILDING/READY/CONFIRMED, polling, descarga ZIP) por un confirm simple que haga PATCH `/api/works/{workId}` con `{ status: "ARCHIVED" }`. Eliminar los estados de `archiveStatus`, el polling con `useEffect`/`setInterval`, y el diálogo multi-fase. Dejar solo: opción "Archivar" en menú → `window.confirm("¿Archivar este proyecto?")` → PATCH → callback de recarga/navegación. Mantener para ARCHIVED: opción "Desarchivar" (PATCH con `{ status: "ACTIVE" }`) y "Eliminar definitivamente" (DELETE existente con confirmación de nombre).

**Checkpoint**: Archivar es un click + confirm, sin exportación.

---

## Phase 3: Polish

- [x] T003 [sonnet] Verificación visual: probar archivar un proyecto, verificar que desaparece de lista activa y aparece en Archivados. Probar desarchivar. Verificar que no hay mención a exportar/paquete/ZIP en el flujo.

---

## Dependencies & Execution Order

- T001 → T002 → T003 (secuencial, cada uno depende del anterior)

## Implementation Strategy

### MVP

1. T001: API acepta status en PATCH
2. T002: UI simplificada
3. T003: verificación
