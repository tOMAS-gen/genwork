# Implementation Plan: Mejora de etiquetas — UI de sistema y color de proyecto

**Branch**: `006-etiquetas-ui-color` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-etiquetas-ui-color/spec.md`

## Summary

Mejorar el sistema de etiquetas con: (1) sección dedicada de gestión en Administración, (2) derivar color de proyecto desde la primera etiqueta, mostrándolo en home, drawer y dashboard, y (3) corregir el bug del endpoint POST incorrecto en el picker inline.

## Technical Context

**Language/Version**: TypeScript 5.8+ / Next.js 15 (App Router)

**Primary Dependencies**: React 19, Prisma 6, Zod 3, lucide-react, next-auth 5 beta

**Storage**: PostgreSQL via Prisma ORM

**Testing**: vitest (unit tests en `tests/unit/`)

**Target Platform**: Web (Node.js server + browser client)

**Project Type**: Web application (full-stack Next.js monolítico)

**Performance Goals**: Estándar web — respuestas <500ms, no hay requisitos especiales de performance

**Constraints**: Single developer, mantener simplicidad (Constitution Principle V)

**Scale/Scope**: Pocos usuarios, <100 proyectos activos simultáneos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación |
|-----------|--------|---------------|
| I. Tarea única, múltiples vistas | ✅ No afectado | Feature toca etiquetas de proyecto (Work), no de tareas |
| II. Etiquetado inline | ✅ No afectado | Tags inline (#, @, /) son independientes del sistema label key/value |
| III. Trabajo = Doc + Tareas | ✅ No afectado | No cambia la estructura del trabajo |
| IV. Estados simples | ✅ No afectado | No modifica estados de tareas |
| V. Simplicidad primero | ✅ Alineado | Reutiliza modelo existente (LabelKey/LabelValue/WorkLabel), sin migraciones, color derivado en runtime |

**Gate**: PASS — sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/006-etiquetas-ui-color/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-labels.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (archivos nuevos o modificados)

```text
src/
├── app/
│   ├── (main)/admin/labels/page.tsx         # NUEVO: sección admin de etiquetas
│   ├── (main)/admin/page.tsx                # MOD: agregar link a etiquetas
│   ├── (main)/page.tsx                      # MOD: indicador de color en cards
│   ├── api/labels/route.ts                  # MOD: ya funciona (GET/POST)
│   └── api/works/route.ts                   # MOD: incluir labels para drawer
├── components/
│   ├── works/LabelPicker.tsx                # MOD: fix endpoint POST
│   ├── works/LabelAdmin.tsx                 # NUEVO: tabla admin de etiquetas
│   ├── works/projectColor.ts               # NUEVO: helper derivar color de proyecto
│   ├── nav/DrawerNav.tsx                    # MOD: dot de color por proyecto
│   └── board/BoardGrid.tsx                  # MOD: tag de proyecto con color
├── lib/domain/works/projectColor.ts         # NUEVO: lógica pura de color (testeable)
└── app/globals.css                          # MOD: estilos de dot y color indicator

tests/unit/
└── project-color.test.ts                    # NUEVO: test derivación de color
```

**Structure Decision**: Monolítico Next.js App Router existente. Archivos nuevos siguen convención: componentes en `src/components/`, lógica pura en `src/lib/domain/`, API routes en `src/app/api/`, páginas en `src/app/(main)/`.

## Complexity Tracking

Sin violaciones — no aplica.
