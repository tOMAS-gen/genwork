# Implementation Plan: Fix — Etiquetas no visibles al asignar en un proyecto

**Branch**: `031-fix-etiquetas-asignacion` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/031-fix-etiquetas-asignacion/spec.md`

## Summary

El selector de etiquetas de un proyecto muestra solo las etiquetas del grupo del proyecto (`GET /api/labels?groupId=X`) o solo las personales del usuario, nunca la unión con las etiquetas "generales de administración". Además, esas "generales" hoy se guardan como personales del super-admin (`groupId=null, ownerId=superadmin`), por lo que nunca aparecen en proyectos de grupo, y la regla de asignación (`PUT /api/works/{id}/labels`) las rechazaría por ámbito.

El fix: (1) introducir un **ámbito global** de etiqueta (`groupId=null, ownerId=null`) gestionado desde administración; (2) migrar las etiquetas del super-admin a globales; (3) hacer que el listado devuelva la **unión** globales + ámbito del proyecto; (4) permitir asignar globales a cualquier proyecto; (5) agregar UI para que **admins de grupo** gestionen las etiquetas de su grupo (el backend ya lo soporta, falta la pantalla); (6) distinguir el origen en el selector.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL, next-auth 5, Zod

**Storage**: PostgreSQL vía Prisma (`LabelKey`, `LabelValue`, `WorkLabel`)

**Testing**: Vitest (dominio puro en `src/lib/domain/**`, contrato en `tests/`)

**Target Platform**: Web app (App Router, server + client components)

**Project Type**: Web application (Next.js single-app)

**Performance Goals**: Selector carga en <2s; asignación reflejada en <2s (SC-003)

**Constraints**: No tocar el motor de permisos core (`access()`) para no arriesgar otros recursos; la visibilidad de globales se resuelve en la capa de etiquetas.

**Scale/Scope**: Proyecto de un solo dev; pocas decenas de etiquetas por ámbito.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I. Tarea única, múltiples vistas | No — fix sobre etiquetas de proyecto, no sobre tareas ni su duplicación | ✅ PASS |
| II. Etiquetado inline | No — las etiquetas de proyecto (LabelKey/Value) son un sistema distinto del etiquetado inline `/#@` de tareas | ✅ PASS |
| III. Trabajo = Doc + Tareas | No — no altera la estructura del trabajo | ✅ PASS |
| IV. Estados simples | No aplica | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — se agrega ámbito global y pantalla de gestión de grupo | ✅ PASS (justificado abajo) |

**Justificación Principio V**: el ámbito global es explícitamente pedido por el usuario y es la forma correcta de modelar "etiquetas generales de administración" (hoy mal modeladas como personales del super-admin). Se evita tocar el motor de permisos general: la visibilidad de globales se maneja localmente en los endpoints de etiquetas. La gestión de grupo reutiliza el gate `canManageGroup` y el componente `LabelAdmin` existentes (parametrizados por ámbito), sin entidades nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/031-fix-etiquetas-asignacion/
├── plan.md              # Este archivo
├── research.md          # Decisiones (ámbito global, migración, unión, gestión de grupo)
├── data-model.md        # LabelKey scope global + reglas de visibilidad/asignación
├── contracts/
│   └── labels-api.md    # Contratos GET/POST /api/labels, PUT /works/{id}/labels
├── quickstart.md        # Validación E2E manual
└── checklists/
    └── requirements.md  # (de /speckit-specify)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # Comentario de ámbito (global permitido); sin cambio estructural
└── migrations/
    └── 0031_labels_global_scope/         # NUEVA: migra personales-de-superadmin → global

src/
├── server/
│   └── guards.ts                         # requireLabelAdmin: caso ámbito global → solo SUPERADMIN
├── lib/domain/labels/
│   └── availability.ts                   # NUEVA: función pura que arma la unión de etiquetas disponibles
├── app/api/
│   ├── labels/route.ts                   # GET unión (global + grupo|personal) con `scope`; POST admite global
│   ├── labels/keys/[id]/route.ts         # gate global en renombrar/eliminar
│   ├── labels/values/route.ts            # gate global al crear valor global
│   └── works/[id]/
│       ├── route.ts                      # incluir origen/scope en labels del work (US3)
│       └── labels/route.ts               # PUT: aceptar etiqueta global además del ámbito del work
├── components/works/
│   ├── LabelPicker.tsx                    # mostrar origen (US3) + copy de estado vacío
│   └── LabelAdmin.tsx                     # parametrizar por ámbito (global | groupId)
└── app/(main)/
    ├── admin/labels/page.tsx             # ámbito global (era personal del superadmin)
    └── groups/[id]/page.tsx              # montar gestión de etiquetas de grupo para admins

src/lib/domain/labels/__tests__/          # tests de la función de disponibilidad
tests/                                     # contrato: regla de asignación acepta global, gate global
```

**Structure Decision**: Web app Next.js single-project. Cambio transversal backend (endpoints + gate + migración) y frontend (picker + gestión). Se evita tocar el motor de permisos core; el ámbito global se maneja en la capa de etiquetas, con una función pura de disponibilidad testeable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nuevo ámbito "global" (groupId=null, ownerId=null) | Modela "etiquetas generales de administración" pedidas por el usuario; visibles en todos los proyectos | Reusar personales-del-superadmin (rechazado en clarify): acopla "general" a una cuenta y causó el bug |
| Migración de datos | Las etiquetas ya creadas por el super-admin deben volverse visibles (es el bug reportado) | No migrar dejaría las etiquetas existentes ocultas |
