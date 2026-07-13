# Implementation Plan: Permisos y nombres de carpeta en Nextcloud

**Branch**: `053-permisos-nombres-nextcloud` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/053-permisos-nombres-nextcloud/spec.md`

## Summary

Corregir la sincronización de permisos de carpeta Nextcloud cuando un usuario entra/sale de un grupo por membresía directa (US1), normalizar a minúsculas el nombre de carpeta de un proyecto en Nextcloud — sin repetir el grupo, que ya es el directorio contenedor (US2), migrando también las carpetas existentes, y agregar una verificación diaria automática que detecte y reporte diferencias de permisos entre genwork y Nextcloud (US3). Enfoque técnico: reutilizar al máximo la infraestructura existente — `ProvisioningJob`/cola con reintentos (`src/lib/storage/queue.ts`) y el panel `Admin > Storage` ya existente. `buildProjectCode` (`src/lib/domain/works/projectCode.ts`) sigue siendo solo el código de referencia de display — NO se usa para nombrar carpetas. No se agregan tablas, paneles ni endpoints nuevos.

## Technical Context

**Language/Version**: TypeScript 5.8, Next.js 15 (App Router)

**Primary Dependencies**: Next.js 15, Prisma 6 (ORM sobre PostgreSQL), cliente HTTP propio para la OCS/WebDAV API de Nextcloud (`src/lib/storage/nextcloud.ts`)

**Storage**: PostgreSQL vía Prisma (`ProvisioningJob`, `Group`, `User`, `Work`, `GroupMembership`) + Nextcloud como backend de archivos/permisos

**Testing**: Vitest (`npm run test`, `tests/unit/`)

**Target Platform**: servidor Node.js (Next.js self-hosted), instancia Nextcloud Docker

**Project Type**: aplicación web única (Next.js, sin split frontend/backend separado) — Option 1

**Performance Goals**: la auditoría diaria no debe generar carga perceptible — un job liviano por grupo, corriendo en background vía el ticker en proceso ya existente

**Constraints**: reutilizar la infraestructura de `ProvisioningJob`/cola/backoff/panel admin ya existente (Principio V de la constitution — simplicidad); no introducir un segundo mecanismo de scheduling (cron externo) cuando ya existe el patrón de ticker en proceso para el mismo dominio

**Scale/Scope**: decenas de grupos y proyectos (contexto de taller/empresa), no requiere paralelismo ni particionado especial para la auditoría diaria ni la migración de nombres

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Tarea única, múltiples vistas** — N/A, esta feature no toca tareas.
- **II. Etiquetado inline** — N/A, no introduce ni modifica símbolos de etiquetado.
- **III. Trabajo = Documentación + Tareas** — N/A, no toca la página de trabajo.
- **IV. Completado binario, estados configurables** — N/A, no toca estados de tarea.
- **V. Simplicidad primero (YAGNI)** — Cumple explícitamente: reutiliza `ProvisioningJob`, el panel admin existente y el formato de nombre de carpeta que ya existía (`formatFolderName`, solo se le agrega `.toLowerCase()`) en vez de crear tablas/paneles/formatos nuevos (ver research.md R2–R5). Único elemento nuevo: un valor de enum (`AUDIT_GROUP_PERMISSIONS`) y un método de interfaz (`listGroupMembers`) — ambos extienden patrones ya existentes, no agregan capas.

**Resultado**: PASS, sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/053-permisos-nombres-nextcloud/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera `contracts/`: la feature no introduce interfaces públicas nuevas (el endpoint `/api/admin/storage/jobs` ya existente no cambia de forma — solo empieza a devolver, entre los mismos campos, jobs con `kind: "AUDIT_GROUP_PERMISSIONS"`).

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # +1 valor de enum JobKind
└── migrations/                            # +1 migración (ALTER TYPE)

src/lib/storage/
├── provider.ts                            # +1 método en la interfaz StorageProvider (listGroupMembers)
├── nextcloud.ts                           # implementación de listGroupMembers (OCS Group API)
├── paths.ts                               # formatFolderName: agrega .toLowerCase() al resultado (sin más cambios)
├── queue.ts                               # runJob: nuevo case AUDIT_GROUP_PERMISSIONS; fix conteo de intentos
                                            # cuando la dependencia (grupo/usuario) todavía no existe (R1);
                                            # nuevo startPermissionAuditTicker (patrón de startQueueTicker)
├── permissionAudit.ts                     # nuevo: compara GroupMembership vs storage.listGroupMembers
└── folderNameMigration.ts                 # nuevo: migrateWorkFolderNames(), encola RENAME_WORK_FOLDER
                                            # para proyectos cuya carpeta todavía no está en minúsculas (FR-007)

src/lib/domain/works/
└── projectCode.ts                         # sin cambios de comportamiento; se corrige el docstring
                                            # (no se usa para nombrar carpetas, ver R4)

src/instrumentation.ts                     # arranca startPermissionAuditTicker y llama migrateWorkFolderNames()
                                            # una vez al boot (automático, sin gatillo manual — FR-007)

tests/unit/
├── storage-paths.test.ts                  # existente — actualizar para el nuevo formato de nombre
└── storage-permission-audit.test.ts       # nuevo — cubre R1 (conteo de intentos) y comparación de miembros
```

**Structure Decision**: Option 1 (proyecto único Next.js). Todo el trabajo cae dentro de `src/lib/storage/` (dominio de almacenamiento ya existente) y `prisma/`; no se crean apps ni paquetes nuevos.

## Complexity Tracking

*Sin violaciones — tabla no aplica.*
