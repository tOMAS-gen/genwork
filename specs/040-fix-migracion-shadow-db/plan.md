# Implementation Plan: Arreglar orden de migraciones (shadow DB)

**Branch**: `040-fix-migracion-shadow-db` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-fix-migracion-shadow-db/spec.md`

## Summary

Renombrar las 10 carpetas de `prisma/migrations/` cuyo prefijo (numérico corto `000N`
o timestamp incompleto) no refleja el orden real de dependencias, a un prefijo
timestamp completo que sí lo hace (mapeo validado en `research.md` §3 con un replay
exitoso de punta a punta contra una base descartable). Actualizar en paralelo la tabla
`_prisma_migrations` de la base de datos de desarrollo local para que seus nombres
coincidan con las carpetas renombradas, de modo que Prisma la siga viendo "al día" sin
reaplicar nada. No se toca el contenido SQL de ninguna migración.

## Technical Context

**Language/Version**: Bash + SQL (operación de infraestructura, no requiere cambios de
código de aplicación).

**Primary Dependencies**: Prisma CLI (`prisma migrate`, `prisma db execute`) ya
presentes en el proyecto; PostgreSQL 16 (mismo motor que usa Genwork).

**Storage**: PostgreSQL — la base de datos de desarrollo local (`genwork` en
`localhost:5433`, ver `.env`).

**Testing**: Verificación operacional (replay completo contra una base descartable +
`prisma migrate status`), documentada en `quickstart.md`. Sin tests automatizados
nuevos — no hay lógica de dominio involucrada.

**Target Platform**: Entorno de desarrollo local (Docker Compose, `deploy/docker-compose.dev.yml`).

**Project Type**: Corrección de infraestructura dentro del monorepo Next.js existente
— no agrega código de aplicación.

**Performance Goals**: N/A.

**Constraints**: FR-003 — el contenido SQL de las migraciones ya aplicadas no puede
cambiar (solo el nombre de carpeta), para no invalidar el checksum que Prisma valida
contra `_prisma_migrations`.

**Scale/Scope**: 10 carpetas renombradas + 10 filas actualizadas en
`_prisma_migrations` de una única base de datos (desarrollo local — sin entorno de
producción con este historial, ver spec.md → Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Resultado |
|---|---|---|
| I. Tarea única, múltiples vistas | No aplica (no toca el dominio de tareas/vistas). | N/A |
| II. Etiquetado inline | No aplica (no toca el parser ni la UI). | N/A |
| III. Trabajo = Documentación + Tareas | No aplica. | N/A |
| IV. Estados simples e historial visible | No aplica. | N/A |
| V. Simplicidad primero (YAGNI) | El arreglo es el mínimo necesario: solo renombra carpetas y sincroniza una tabla, sin agregar herramientas, scripts permanentes ni abstracciones nuevas. | PASS |

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/040-fix-migracion-shadow-db/
├── plan.md              # This file
├── research.md           # Causa raíz + mapeo de renombres (validado)
├── quickstart.md         # Pasos de verificación
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

No aplica `data-model.md` (no hay entidades de dominio nuevas) ni `contracts/` (no hay
interfaz externa nueva — es una corrección interna de infraestructura).

### Source Code (repository root)

```text
prisma/
└── migrations/
    ├── 20260703143511_init/                          # antes: 0001_init
    ├── 20260703143512_work_description/               # antes: 0002_work_description
    ├── 20260703143513_ownership_labels/                # antes: 0003_ownership_labels
    ├── 20260703182355_dashboard/                       # antes: 0004_dashboard
    ├── 20260704025119_sector_color/                    # antes: 0005_sector_color
    ├── 20260705004323_work_templates/                  # antes: 0005_work_templates
    ├── 20260705173143_personal_stages/                 # antes: 20260705_personal_stages
    ├── 20260706160007_labels_global_scope/              # antes: 0031_labels_global_scope
    ├── 20260706165732_task_labels/                      # antes: 0032_task_labels
    ├── 20260706185921_colors_to_hex/                    # antes: 0033_colors_to_hex
    └── ... (resto de carpetas sin cambios)
```

**Structure Decision**: Cada "carpeta renombrada" es literalmente `git mv <vieja>
<nueva>` (mismo `migration.sql`, sin editar su contenido). No se crean carpetas nuevas
de migración ni se agregan scripts permanentes al repo — el `UPDATE` sobre
`_prisma_migrations` se ejecuta una vez, a mano, contra la base de desarrollo local
(no queda como artefacto versionado, ver tasks.md).

## Complexity Tracking

> Sin violaciones — tabla vacía.
