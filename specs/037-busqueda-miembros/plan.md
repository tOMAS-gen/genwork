# Implementation Plan: Búsqueda de usuarios para agregar miembros

**Branch**: `037-busqueda-miembros` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-busqueda-miembros/spec.md`

## Summary

Reemplazar el campo de email libre del alta de miembros de grupo por un buscador
tipo combobox que sugiere usuarios existentes de la plataforma (por nombre o
email, insensible a mayúsculas/tildes) a medida que se escribe, excluyendo a
quienes ya son miembros. El alta sigue creando el mismo `GroupMembership` de
siempre; solo cambia cómo se elige al usuario destino. Sectores queda
explícitamente fuera de alcance (no tienen modelo de miembros).

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js (Next.js 15 App Router, React 19)

**Primary Dependencies**: Next.js 15 (API routes), Prisma 6 (ORM), Zod (validación), React 19

**Storage**: PostgreSQL vía Prisma. Sin migraciones nuevas: se reutilizan `User` y
`GroupMembership` existentes; no se agrega ninguna tabla ni columna.

**Testing**: Vitest (tests unitarios de dominio, ver `tests/unit/` y
`src/lib/domain/**/__tests__/`)

**Target Platform**: Web (navegador de escritorio y mobile), app existente

**Project Type**: Web app full-stack (Next.js App Router: API routes + React client components)

**Performance Goals**: Resultados de búsqueda en <1s en el 95% de los casos (SC-003)

**Constraints**: Reutilizar el guard de permisos existente (`canManageGroup`); no
crear nuevos roles ni tablas; mantener el contrato de alta (`role: ADMIN|MEMBER`)
sin cambios.

**Scale/Scope**: Alcance acotado a organizaciones/talleres pequeños-medianos (decenas
a cientos de usuarios registrados); sin requisito de paginación infinita — se acota
la cantidad de resultados devueltos (ver research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Evaluación |
|---|---|---|
| I. Tarea única, múltiples vistas | No | La feature no toca tareas ni sus vistas. |
| II. Etiquetado inline como interfaz primaria | No | No es clasificación de tareas; es alta de miembros de grupo, flujo de formulario existente. |
| III. Trabajo = Documentación + Tareas | No | No toca la página de trabajo. |
| IV. Estados simples e historial visible | No | No introduce estados de tarea. |
| V. Simplicidad primero (YAGNI) | Sí | Se reutilizan `User`/`GroupMembership`/`canManageGroup` existentes; no se crean entidades, tablas, roles ni endpoints de sector. El único elemento nuevo es un endpoint de búsqueda (GET) y un componente de combobox, ambos siguiendo patrones ya presentes en el código (`/api/tags/suggest`, `useTagAutocomplete`). |

**Resultado**: PASS. No hay violaciones que justificar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/037-busqueda-miembros/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── group-members-search.md
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── groups/
│           └── [id]/
│               └── members/
│                   ├── route.ts          # POST existente (alta) — SIN CAMBIOS de contrato
│                   └── search/
│                       └── route.ts      # NUEVO: GET búsqueda de usuarios candidatos
├── components/
│   └── groups/
│       └── MemberSearchField.tsx         # NUEVO: combobox de búsqueda (reemplaza el input de email)
├── lib/
│   └── domain/
│       └── users/
│           ├── matching.ts               # NUEVO: función pura de matching + exclusión de ya-miembros
│           └── __tests__/
│               └── matching.test.ts      # Tests del filtro nombre/email insensible a acentos
└── app/(main)/groups/[id]/page.tsx       # Integra el nuevo combobox en vez del input manual
```

**Structure Decision**: Se sigue la estructura existente del proyecto (App Router de
Next.js con `src/app/api/**` para endpoints y `src/components/**` por dominio). No se
introduce una carpeta ni capa nueva: el endpoint de búsqueda vive junto al endpoint
de alta ya existente (`/api/groups/[id]/members/`), y el componente nuevo vive junto
a los demás componentes de grupos.

## Complexity Tracking

*Sin violaciones — tabla omitida.*
