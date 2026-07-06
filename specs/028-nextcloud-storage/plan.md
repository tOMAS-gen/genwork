# Implementation Plan: Nextcloud Storage Integration

**Branch**: `028-nextcloud-storage` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/028-nextcloud-storage/spec.md`

## Summary

Extender la integración Nextcloud existente en genwork para: (1) nombrar carpetas de proyecto con formato secuencial legible `NNN-Nombre`, (2) crear la pestaña "Archivos" como visor de contenido Nextcloud con links a la web, (3) mover carpetas al archivar/desarchivar, (4) propagar renombrados, y (5) dockerizar Nextcloud para dev/prod. La base técnica (provider, queue, schema) ya existe — este feature llena los gaps funcionales.

## Technical Context

**Language/Version**: TypeScript 5.8 / Next.js 15.3 (App Router) / React 19.1

**Primary Dependencies**: Prisma 6.8, next-auth 5 (beta.28), webdav 5.8, zod 3.24, lucide-react

**Storage**: PostgreSQL (Prisma) + Nextcloud (WebDAV/OCS API)

**Testing**: Vitest 3.1 (16 unit tests existentes, sin e2e)

**Target Platform**: Web (servidor Linux, clientes browser + Nextcloud desktop)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Carpeta creada en <5s (SC-001), listado de archivos <2s

**Constraints**: Nextcloud caído no bloquea genwork (FR-011), un solo dev

**Scale/Scope**: Equipo pequeño (~10 usuarios), ~100 proyectos, almacenamiento local

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Notas |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | No afecta tareas |
| II. Etiquetado inline | ✅ PASS | No afecta etiquetado |
| III. Trabajo = Doc + Tareas | ✅ PASS | La pestaña Archivos se agrega como tab adicional en la vista del proyecto, no reemplaza ni separa Doc/Tareas |
| IV. Estados simples | ✅ PASS | Solo usa ACTIVE/ARCHIVED existentes |
| V. Simplicidad primero (YAGNI) | ✅ PASS | GenWork es visor read-only (no file manager), reutiliza código existente |

## Project Structure

### Documentation (this feature)

```text
specs/028-nextcloud-storage/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical research
├── data-model.md        # Phase 1: data model changes
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── api.md           # Phase 1: API contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/storage/
│   ├── provider.ts      # MODIFICAR — agregar listShallow(), moveFolder(), renameFolder()
│   ├── nextcloud.ts     # MODIFICAR — implementar nuevos métodos
│   ├── index.ts          # SIN CAMBIOS
│   └── queue.ts          # MODIFICAR — agregar MOVE_WORK_FOLDER, RENAME_WORK_FOLDER
├── app/
│   ├── api/works/[id]/
│   │   ├── route.ts      # MODIFICAR — encolar jobs de move/rename
│   │   └── files/
│   │       └── route.ts  # NUEVO — GET endpoint para listar archivos
│   └── (main)/works/[id]/
│       └── page.tsx       # MODIFICAR — agregar tab Archivos
├── components/
│   └── files/
│       └── FilesBrowser.tsx  # NUEVO — componente visor de archivos

prisma/
├── schema.prisma         # MODIFICAR — folderSeq en Work, nuevos JobKind
└── migrations/
    └── NNNN_folder_seq/  # NUEVA migración

deploy/docker-compose.dev.yml  # NUEVO — Nextcloud + PostgreSQL
.env.nextcloud.example         # NUEVO — template de variables
```

**Structure Decision**: Sigue la estructura existente de Next.js App Router. Componente nuevo en `src/components/files/` siguiendo el patrón de otros componentes (`tasks/`, `projects/`). Endpoint nuevo bajo `api/works/[id]/files/` siguiendo la convención RESTful del proyecto.

## Implementation Summary

### Fase A: Schema + infraestructura

1. Migración Prisma: agregar `folderSeq` a Work, nuevos valores en `JobKind`
2. Docker compose para Nextcloud
3. Actualizar `createWorkFolder` para usar formato `NNN-Nombre`

### Fase B: Provider + queue

4. Agregar `listShallow()`, `moveFolder()`, `renameFolder()` a StorageProvider
5. Implementar en NextcloudProvider
6. Agregar handlers de `MOVE_WORK_FOLDER` y `RENAME_WORK_FOLDER` en queue

### Fase C: API + UI

7. Endpoint `GET /api/works/[id]/files`
8. Componente `FilesBrowser` (visor read-only con links a Nextcloud)
9. Integrar tab Archivos en la página del proyecto
10. Encolar jobs de move/rename desde PATCH `/api/works/[id]`

### Fase D: Verificación

11. Tests unitarios para naming secuencial y URL generation
12. Validación manual end-to-end con docker compose

## Complexity Tracking

> No hay violaciones de Constitution Check. No se requiere justificación.
