# Implementation Plan: Archivado Simple

**Branch**: `027-archivado-simple` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/027-archivado-simple/spec.md`

## Summary

Simplificar el flujo de archivado de proyectos: en vez de requerir generar un ZIP, descargarlo y confirmar, archivar se reduce a cambiar el status del proyecto a ARCHIVED con un diálogo de confirmación simple. La funcionalidad de exportación (ZIP/paquete) se mantiene intacta pero se desvincula del flujo de archivado para una feature futura.

## Technical Context

**Language/Version**: TypeScript 5.x / React 19 / Next.js 15

**Primary Dependencies**: React, Next.js App Router, Prisma ORM

**Storage**: PostgreSQL (Prisma)

**Testing**: vitest (132 tests existentes)

**Target Platform**: Web

**Project Type**: Web application (Next.js)

## Constitution Check

| Principio | Cumple | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ | Sin cambios en modelo de tareas |
| II. Etiquetado inline | ✅ | Sin cambios en parser/etiquetas |
| III. Trabajo = Doc + Tareas | ✅ | El proyecto archivado mantiene doc + tareas intactos |
| IV. Estados simples | ✅ | ACTIVE/ARCHIVED ya existe, no se agregan estados |
| V. Simplicidad (YAGNI) | ✅ | Se simplifica removiendo complejidad innecesaria |

## Project Structure

```text
src/
├── components/projects/ProjectMenu.tsx    # Simplificar diálogo de archivado (modificar)
├── app/api/works/[id]/route.ts            # Endpoint PATCH para archivar/desarchivar (modificar)
```

## Implementation Approach

### Cambio 1: Simplificar ProjectMenu.tsx

El `ProjectMenu.tsx` actual tiene un diálogo complejo con 4 fases (armar paquete → polling → descargar → confirmar). Reemplazar por:

**Para proyecto ACTIVE**:
- Opción "Archivar" → confirm simple → PATCH `/api/works/{id}` con `{ status: "ARCHIVED" }`
- Sin ZIP, sin ArchiveRecord, sin polling

**Para proyecto ARCHIVED**:
- Opción "Desarchivar" → PATCH `/api/works/{id}` con `{ status: "ACTIVE" }`
- Opción "Eliminar definitivamente" → mantener lógica existente de DELETE con confirmación de nombre

### Cambio 2: API — archivar/desarchivar via PATCH

El endpoint PATCH de works ya existe y acepta campos como `dueDate`. Agregar soporte para `status` en el body:
- `{ status: "ARCHIVED" }` → cambia status a ARCHIVED
- `{ status: "ACTIVE" }` → cambia status a ACTIVE (desarchivar)

No se toca la tabla ArchiveRecord ni los endpoints de archive/* — quedan para la feature de exportación.

### Lo que NO se toca

- `src/app/api/works/[id]/archive/` y sub-rutas (confirm, download) — se mantienen para la feature de exportación futura
- Modelo `ArchiveRecord` en Prisma — se mantiene
- Lógica de `buildArchivePackage` — se mantiene
- Filtrado de `?status=ARCHIVED` en API y drawer — ya funciona
