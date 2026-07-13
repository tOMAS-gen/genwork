# Implementation Plan: Gestión completa de archivos en la nube (estilo Nextcloud)

**Branch**: `051-gestion-archivos-nube` | **Date**: 2026-07-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/051-gestion-archivos-nube/spec.md`

## Summary

Extender `StorageProvider` (spec 028/034) con 3 operaciones nuevas — `createFolder`, `delete`, `share` — y exponerlas en `FilesBrowser` para que la pestaña Archivos deje de ser un visor mayormente de solo lectura y pase a soportar crear carpetas, descargar, eliminar y compartir sin salir de genwork. En paralelo, se reemplaza el modelo de acceso de "una sola cuenta admin para todos" por impersonación real por usuario: cada operación de archivos se ejecuta con la identidad propia del usuario que la pidió (`StorageIdentity`), no con la cuenta admin — vía Login Flow v2 de Nextcloud (app password por usuario) y scope incremental de Drive sobre el login de Google ya existente. `FileShare` guarda los accesos puntuales otorgados (link público o alta interna).

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL, next-auth 5, Zod, `webdav` 5.8 (cliente WebDAV ya usado por `NextcloudProvider`). Google Drive API v3 vía `fetch` directo (ya el patrón de la feature 034, sin `googleapis`). Nextcloud OCS **Login Flow v2** (`/index.php/login/v2`) y **OCS Share API** (`/ocs/v2.php/apps/files_sharing/api/v1/shares`) vía `fetch` directo — mismo patrón que `ocs()` ya existente en `NextcloudProvider`.

**Storage**: PostgreSQL — nuevas columnas/modelo para credenciales por usuario (`StorageIdentity`) y accesos compartidos (`FileShare`); reutiliza `AccessConfig`, `Attachment` existentes.

**Testing**: Vitest — lógica pura (mapeo de contratos OCS/Drive, resolución de `StorageIdentity`, validación de permisos antes de delegar al provider) con `fetch`/WebDAV mockeados. Igual criterio que specs 028/034: la UI (FilesBrowser) se verifica manualmente.

**Target Platform**: Web app (App Router; llamadas a Nextcloud/Drive server-side).

**Project Type**: Web application single-app.

**Performance Goals**: Ciclo crear carpeta → subir → descargar → eliminar completo en <30s (SC-001, ya validado con volúmenes de archivo chicos/medianos como en 028/034).

**Constraints**: Ninguna operación de archivos puede ejecutarse sin haber pasado la validación de permisos de genwork (FR-005) ni sin una `StorageIdentity` resuelta para el usuario que la pide (FR-006/FR-011) — si no hay identidad propia disponible (usuario nunca vinculó su cuenta), la operación falla con un error claro que invita a vincularla, no cae a la cuenta admin. Secretos (app password, refresh token) cifrados con `@/lib/crypto` (mismo AES-256-GCM que `AccessConfig`/Google Drive admin). Sin dependencias npm nuevas — se reutiliza `webdav` y `fetch`.

**Scale/Scope**: 3 métodos nuevos en `StorageProvider` (implementados en ambos providers, `createFolder`/`delete`/`share`), 1 modelo `StorageIdentity`, 1 modelo `FileShare`, 2 flujos de vinculación de cuenta (Nextcloud Login Flow v2, Drive scope incremental), extensión de `FilesBrowser` (crear carpeta, descargar, eliminar, compartir) + endpoints REST correspondientes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I. Tarea única, múltiples vistas | No — feature de almacenamiento de archivos, no toca tareas | ✅ PASS |
| II. Etiquetado inline | No — sin símbolos `/ # @ $` involucrados | ✅ PASS |
| III. Trabajo = Documentación + Tareas | No directamente — Archivos es una pestaña ya existente del trabajo (spec 028), esta feature la completa, no la reubica | ✅ PASS |
| IV. Completado binario, estados configurables | No — sin estados de tarea involucrados | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — agrega un modelo de identidad por usuario y 3 operaciones nuevas | ✅ PASS (justificado) |

**Justificación Principio V**: la arquitectura conectable (`StorageProvider`, cola de jobs, cifrado de secretos, panel admin) ya existe y está diseñada para crecer sin reestructurar (igual criterio que 034). `StorageIdentity` es el mínimo necesario para satisfacer el requisito explícito del usuario de que las operaciones no pasen todas por una única cuenta admin (FR-006/FR-011) — la alternativa más simple (seguir con la cuenta admin y solo filtrar permisos en genwork) fue evaluada y descartada explícitamente por el usuario en Clarifications (eligió impersonación real, no solo auditoría server-side).

## Project Structure

### Documentation (this feature)

```text
specs/051-gestion-archivos-nube/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   └── files-crud-and-identity.md
├── quickstart.md         # Fase 1
└── checklists/requirements.md
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                          # + StorageIdentity, FileShare; User sin cambios de forma (relations nuevas)

src/lib/storage/
├── provider.ts                            # + createFolder, delete, share en StorageProvider; + StorageIdentity types
├── nextcloud.ts                           # + createFolder/delete/share (OCS Share API); constructor acepta credencial de usuario
├── gdrive.ts                              # + createFolder/delete/share (Drive API v3); acepta token de usuario
├── identity.ts                            # NUEVO: resolveStorageIdentity(userId) — arma el provider "as user" o devuelve error claro
└── index.ts                               # getStorageProvider ahora puede recibir el usuario solicitante

src/app/api/
├── auth/storage-link/
│   ├── nextcloud/route.ts                 # NUEVO: inicia/consulta Login Flow v2
│   └── google-drive/route.ts              # NUEVO: inicia/consulta scope incremental de Drive
└── works/[id]/files/
    ├── route.ts                           # existente (list) — ahora valida FR-005 explícito
    ├── folder/route.ts                    # NUEVO: POST crear carpeta
    ├── [*path]/route.ts                   # NUEVO: DELETE eliminar
    ├── download/route.ts                  # existente, se confirma/ajusta
    └── share/route.ts                     # NUEVO: POST crear share, DELETE revocar

src/components/files/
└── FilesBrowser.tsx                       # + botones Crear carpeta / Descargar / Eliminar / Compartir + modal de share

src/components/settings/
└── StorageAccountLink.tsx                 # NUEVO: UI en perfil de usuario para vincular su cuenta Nextcloud/Drive

tests/unit/
└── storage-identity.test.ts               # NUEVO
└── storage-paths.test.ts                  # existente
```

**Structure Decision**: Web app single-app existente (Next.js App Router). Se extiende la capa `src/lib/storage/` ya establecida por 028/034 en vez de crear un módulo paralelo; se agrega una superficie de UI nueva y acotada (`StorageAccountLink`) para el paso de vinculación de cuenta que la impersonación real requiere.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No hay violaciones sin justificar — ver justificación de Principio V arriba.
