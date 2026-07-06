# Implementation Plan: Loading States

**Branch**: `026-loading-states` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/026-loading-states/spec.md`

## Summary

Mejorar los estados de carga de las páginas de detalle de proyecto y sector. El proyecto ya tiene un skeleton parcial que no cubre la estructura completa; el sector solo muestra texto "Cargando…". Se reemplazarán ambos por skeletons completos que reproduzcan el layout final usando el componente `Skeleton` existente.

## Technical Context

**Language/Version**: TypeScript 5.x / React 19 / Next.js 15

**Primary Dependencies**: React, Next.js App Router (client components)

**Storage**: N/A (no hay cambios de datos)

**Testing**: Verificación visual manual (sin tests unitarios — componente presentacional puro)

**Target Platform**: Web (navegadores modernos)

**Project Type**: Web application (Next.js)

**Performance Goals**: El skeleton debe renderizar inmediatamente, sin fetch previo

**Constraints**: Usar el componente `Skeleton` existente y los estilos shimmer de `globals.css`

**Scale/Scope**: 2 páginas afectadas (works/[id], sectors/[id])

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ | Sin cambios en modelo de tareas |
| II. Etiquetado inline | ✅ | Sin cambios en parser/etiquetas |
| III. Trabajo = Doc + Tareas | ✅ | El skeleton refleja esta estructura (título + tareas) |
| IV. Estados simples | ✅ | Sin cambios en estados de tarea |
| V. Simplicidad (YAGNI) | ✅ | Solo mejora visual, sin entidades ni capas nuevas |

Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/026-loading-states/
├── plan.md              # Este archivo
├── spec.md              # Especificación
└── checklists/
    └── requirements.md  # Checklist de calidad
```

### Source Code (repository root)

```text
src/
├── app/(main)/works/[id]/page.tsx    # Skeleton de proyecto (modificar)
├── app/(main)/sectors/[id]/page.tsx  # Skeleton de sector (modificar)
└── components/ui/Skeleton.tsx        # Componente existente (sin cambios)
```

**Structure Decision**: Solo se modifican 2 archivos de página existentes. No se crean componentes nuevos — los skeletons se construyen inline con el componente `Skeleton` existente, igual que ya se hace parcialmente en works/[id]/page.tsx.

## Implementation Approach

### Fase A — Skeleton de proyecto (works/[id]/page.tsx)

El skeleton actual (líneas 80-101) cubre título y tareas pero omite breadcrumb, barra de estado, descripción y tabs. Se expande para incluir:

1. Skeleton de breadcrumb (línea corta de texto)
2. Skeleton de título + subtítulo (ya existe)
3. Skeleton de descripción (texto ancho)
4. Skeleton de barra de estado (línea con pastillas)
5. Skeleton de tabs (3 rectángulos)
6. Skeleton de tareas (5 líneas, ya existe)

### Fase B — Skeleton de sector (sectors/[id]/page.tsx)

Reemplazar `<p className="muted">Cargando…</p>` por skeleton completo:

1. Skeleton de título del sector (h1)
2. Skeleton de input de tareas (rectángulo tipo card)
3. Skeleton de filtros (3 pastillas cortas)
4. Skeleton de "Tareas del sector" (h2 + 5 líneas de tarea)

### Patrón de skeleton

Ambas páginas siguen el mismo patrón ya establecido en el código:
- `if (!data) return <skeleton JSX>;`
- Usan `<Skeleton variant="text|card" width="X%" height="Ypx" />`
- Envueltos en el mismo contenedor que el contenido final (`.sheet` para proyectos, `<div>` para sectores)
