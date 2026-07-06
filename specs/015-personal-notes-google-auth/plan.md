# Implementation Plan: Sector Personal, Notas y Google Auth

**Branch**: `015-personal-notes-google-auth` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-personal-notes-google-auth/spec.md`

## Summary

Tres mejoras independientes: (1) sector personal auto-creado por usuario con notas rich-text usando TipTap como editor, (2) rediseño visual de /admin para usar el design system existente (project-card, sheet, etc.), y (3) guardar la imagen de perfil de Google OAuth y mostrar avatar + nombre en el sidebar. Google auth ya funciona vía next-auth — solo falta persistir la foto y exponerla en UI.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15 App Router

**Primary Dependencies**: next-auth 5 beta (Google provider ya configurado), Prisma 6, lucide-react, TipTap (nuevo — editor rich-text)

**Storage**: PostgreSQL vía Prisma ORM

**Testing**: vitest (unit), verificación visual manual (UI)

**Target Platform**: Web responsive (desktop + mobile ≤768px)

**Project Type**: Web application (Next.js)

**Performance Goals**: Autoguardado en <2s, renderizado inmediato

**Constraints**: Reutilizar design system existente. Una sola dependencia nueva (TipTap). DEV_AUTH sigue funcionando en desarrollo.

**Scale/Scope**: 3 páginas afectadas (/admin, sector personal, sidebar), 1 modelo nuevo (Note), 1 migración, ~5 componentes nuevos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Tarea única, múltiples vistas | ✅ PASS | Notas son entidad separada de tareas — no usan etiquetado ni vistas cruzadas |
| II. Etiquetado inline | ✅ PASS | Notas no participan del sistema de etiquetado (/, #, @) |
| III. Trabajo = Documentación + Tareas | ✅ PASS | Notas viven en sector personal, no en trabajos — no afecta la estructura Doc+Tasks de trabajos |
| IV. Estados simples | ✅ PASS | Notas no tienen estados Pendiente/Realizada — son contenido libre |
| V. Simplicidad (YAGNI) | ✅ PASS | Editor TipTap básico (no Notion completo). Una tabla nueva (Note). Admin reusa CSS existente. |

No hay violaciones. Gate aprobado.

## Project Structure

### Documentation (this feature)

```text
specs/015-personal-notes-google-auth/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── data-model.md        # Phase 1 — Note entity
├── quickstart.md        # Phase 1 — validation guide
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (main)/
│   │   ├── admin/page.tsx              # US2: rediseño visual
│   │   ├── notes/                      # US1: lista y editor de notas
│   │   │   ├── page.tsx                # Lista de notas del sector personal
│   │   │   └── [id]/page.tsx           # Editor de nota individual
│   │   └── layout.tsx                  # Sin cambios
│   ├── api/
│   │   ├── notes/                      # US1: CRUD de notas
│   │   │   ├── route.ts                # GET (listar), POST (crear)
│   │   │   └── [id]/route.ts           # GET, PATCH (autoguardado), DELETE
│   │   └── me/route.ts                 # Ya existe — extender con avatar
│   └── login/page.tsx                  # Sin cambios (Google auth ya funciona)
├── components/
│   ├── nav/
│   │   └── DrawerNav.tsx               # US3: avatar + nombre arriba
│   └── notes/
│       ├── NoteEditor.tsx              # US1: editor TipTap
│       └── NoteList.tsx                # US1: lista de notas
├── server/
│   └── auth.ts                         # US3: persistir image de Google
└── lib/
    └── domain/notes/                   # Lógica de dominio de notas (si necesaria)

prisma/
├── schema.prisma                       # Note model, User.image field
└── migrations/0005_personal_notes/     # Migración
```

**Structure Decision**: Notas viven en `/notes` como ruta propia (no dentro de `/sectors/[id]`), ya que el sector personal es conceptualmente diferente y tiene su propia navegación. El sidebar lo enlaza directamente.

## Complexity Tracking

No hay violaciones de constitution. Tabla vacía.
