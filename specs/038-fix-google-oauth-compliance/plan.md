# Implementation Plan: Fix Google OAuth Compliance

**Branch**: `038-fix-google-oauth-compliance` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/038-fix-google-oauth-compliance/spec.md`

## Summary

El flujo OAuth de Google Drive falla con Error 400: invalid_request porque la app de Google Cloud Console no tiene el OAuth consent screen correctamente configurado para scopes sensibles (Drive). Se corrige con: (1) validación pre-vuelo de credenciales antes de redirigir a Google, (2) mapeo de errores OAuth a mensajes accionables en español, (3) mostrar la redirect URI en el panel para evitar mismatch, (4) guía de configuración accesible desde el panel.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node 20+ (Next.js 15)

**Primary Dependencies**: next-auth 5.0.0-beta.28, Prisma 6.8, React 19, Zod 3.24

**Storage**: PostgreSQL (Prisma ORM) — AccessConfig.storageConfig (JSON)

**Testing**: Vitest 3.1, ESLint 9

**Target Platform**: Web (Docker Linux server)

**Project Type**: Web application (Next.js App Router, monolítico)

**Performance Goals**: N/A (flujo de configuración admin, no hot path)

**Constraints**: Sin dependencias npm nuevas. Solo fetch nativo para Google APIs.

**Scale/Scope**: Flujo usado por 1 admin, poca concurrencia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Status | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ No aplica | No toca tareas ni vistas |
| II. Etiquetado inline | ✅ No aplica | No toca parser de etiquetas |
| III. Trabajo = Doc + Tareas | ✅ No aplica | No toca estructura de trabajos |
| IV. Estados simples | ✅ No aplica | No toca estados de tareas |
| V. Simplicidad primero (YAGNI) | ✅ Cumple | Fix mínimo: validaciones + mensajes + guía. Sin abstracciones nuevas. |

**Gate: PASS** — ningún principio violado.

## Project Structure

### Documentation (this feature)

```text
specs/038-fix-google-oauth-compliance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (archivos a modificar)

```text
src/
├── app/
│   ├── api/admin/storage/google/
│   │   ├── authorize/route.ts      # Validación pre-vuelo + redirect URI
│   │   └── callback/route.ts       # Mapeo de errores OAuth
│   └── (main)/admin/storage/
│       └── page.tsx                 # Mostrar redirect URI + guía + mensajes
├── lib/storage/
│   └── google-auth.ts              # Sin cambios (helpers OAuth ya correctos)
└── deploy/
    └── .env.example                 # Documentar variables GDRIVE_*
```

**Structure Decision**: Monolítico Next.js existente. Solo se tocan 4 archivos existentes + posible componente de guía inline.

## Complexity Tracking

> Sin violaciones de constitution. No se requiere justificación.
