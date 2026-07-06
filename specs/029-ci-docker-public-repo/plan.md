# Implementation Plan: CI Docker & Repo Público

**Branch**: `029-ci-docker-public-repo` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/029-ci-docker-public-repo/spec.md`

## Summary

Crear un workflow de GitHub Actions que construya y publique la imagen Docker en GHCR en cada push a `main` y en tags `v*`. Hacer condicional la integración Nextcloud para que la app funcione sin ella. Validar variables obligatorias al arrancar. Preparar el repo para hacerlo público (auditoría de secretos). Documentar despliegue.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3, Prisma 6.8, next-auth 5 beta, webdav 5.8

**Storage**: PostgreSQL (Prisma) + Nextcloud (WebDAV/OCS, opcional)

**Testing**: Vitest 3.1

**Target Platform**: Linux server (Docker)

**Project Type**: Web application (Next.js App Router, standalone output)

**Performance Goals**: Build CI < 10 min, app boot < 30s

**Constraints**: Imagen multi-stage existente en `deploy/Dockerfile`. Prisma CLI global en imagen de producción.

**Scale/Scope**: Aplicación interna de un equipo pequeño.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I. Tarea única, múltiples vistas | No — feature de infra, no cambia modelo de tareas | ✅ PASS |
| II. Etiquetado inline | No — sin cambios al parser ni clasificación | ✅ PASS |
| III. Trabajo = Doc + Tareas | No — sin cambios a la UI de trabajos | ✅ PASS |
| IV. Estados simples | No — sin cambios a estados | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — verificar que la opcionalidad de NC no agrega capas innecesarias | ✅ PASS — patrón `null` return, sin abstracciones nuevas |

**Post-design re-check**: PASS. El cambio a `getStorageProvider()` es mínimo (retornar `null` en vez de throw). No se agregan nuevas entidades, capas ni patrones.

## Project Structure

### Documentation (this feature)

```text
specs/029-ci-docker-public-repo/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── docker-publish.yml      # NUEVO: workflow CI

deploy/
├── Dockerfile                  # EXISTENTE: actualizar entrypoint
├── entrypoint.sh               # EXISTENTE: agregar validación de env vars
├── docker-compose.yml          # EXISTENTE: referencia
├── docker-compose.dev.yml      # EXISTENTE: referencia
└── README.md                   # EXISTENTE: actualizar documentación

src/
├── instrumentation.ts          # EXISTENTE: condicionar queue ticker
└── lib/
    └── storage/
        └── index.ts            # EXISTENTE: retornar null si NC no configurado
```

**Structure Decision**: No se crean directorios nuevos excepto `.github/workflows/`. Los cambios son puntuales en archivos existentes.

## Complexity Tracking

Sin violaciones a la constitution. No se requiere justificación.
