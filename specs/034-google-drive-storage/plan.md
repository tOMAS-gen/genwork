# Implementation Plan: Google Drive como almacenamiento opcional + subida de archivos

**Branch**: `034-google-drive-storage` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/034-google-drive-storage/spec.md`

## Summary

Agregar `GoogleDriveProvider` que implementa la interfaz `StorageProvider` ya existente, habilitando Google Drive como proveedor de almacenamiento opcional junto a Nextcloud. El administrador conecta Google Drive vía **OAuth (consentimiento con scope Drive)**; se guarda su **refresh token cifrado** y el ID de un **Shared Drive dedicado** en `AccessConfig.storageConfig`. `getStorageProvider()` ya tiene la rama GDRIVE (hoy lanza error) — se implementa para devolver el provider real. Se completa la **UI de subida de archivos** en el visor del proyecto (el backend `POST /works/[id]/attachments` ya llama `storage.upload`, falta la UI y subir a la subcarpeta actual). Todo reutiliza la arquitectura conectable: cola de jobs, cifrado, panel `/admin/storage`.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router), Prisma 6.8, PostgreSQL, next-auth 5, Zod. **Google Drive API v3 + OAuth2** vía `fetch` directo (sin dependencia nueva; ver research R1).

**Storage**: PostgreSQL (`AccessConfig`, `Attachment`, `ArchiveRecord`, `ProvisioningJob`) + Google Drive (Shared Drive) como backend de archivos.

**Testing**: Vitest (lógica pura: mapeo de config, resolución de provider, parseo de respuestas Drive con fetch mockeado).

**Target Platform**: Web app (App Router, server-side para las llamadas a Google).

**Project Type**: Web application single-app.

**Performance Goals**: Subir un archivo de pocos MB y verlo en <30s (SC-003).

**Constraints**: No pedir permisos de Drive a cada usuario (solo identidad); el acceso lo intermedia la plataforma con el refresh token del admin. Secretos cifrados (AES-256-GCM, `@/lib/crypto`). Sin dependencias npm nuevas.

**Scale/Scope**: 1 provider nuevo (10 métodos de la interfaz), flujo OAuth admin (2 endpoints), panel extendido, UI de subida.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I–IV | No — feature de infraestructura de almacenamiento; no toca tareas, vistas, doc ni estados | ✅ PASS |
| V. Simplicidad (YAGNI) | Sí — se agrega un provider y un flujo OAuth | ✅ PASS (justificado) |

**Justificación Principio V**: la arquitectura de almacenamiento conectable ya está diseñada para esto (interfaz `StorageProvider`, enum `StorageProviderKind` con `GDRIVE`, rama en `getStorageProvider`, panel admin, cifrado, cola). El feature *completa* una extensión ya prevista, sin reestructurar. Se evita la dependencia `googleapis` usando `fetch` a las APIs REST (operaciones acotadas). La subida de archivos es una capacidad faltante pedida explícitamente.

## Project Structure

### Documentation (this feature)

```text
specs/034-google-drive-storage/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── gdrive-and-upload.md
├── quickstart.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                         # (sin cambio estructural: storageConfig Json ya soporta la config de GDrive)

src/
├── lib/storage/
│   ├── provider.ts                       # + GoogleDriveConfig type (refreshToken, sharedDriveId, clientId, clientSecret)
│   ├── gdrive.ts                         # NUEVO: GoogleDriveProvider implements StorageProvider (Drive REST v3 + OAuth vía fetch)
│   ├── google-auth.ts                    # NUEVO: obtener access token desde refresh token; helpers OAuth
│   └── index.ts                          # implementar la rama GDRIVE de getStorageProvider (hoy lanza error)
├── app/api/admin/storage/
│   ├── route.ts                          # GET/PUT: soportar provider GDRIVE (sharedDriveId, estado de conexión)
│   ├── test/route.ts                     # test de conexión también para GDrive
│   └── google/
│       ├── authorize/route.ts            # NUEVO: inicia OAuth (redirect a Google, scope drive, offline+consent)
│       └── callback/route.ts             # NUEVO: recibe code, intercambia por refresh token, guarda cifrado
├── app/(main)/admin/storage/page.tsx     # UI: selector de proveedor + "Conectar con Google" + Shared Drive + probar
├── app/api/works/[id]/files/
│   └── upload/route.ts                   # NUEVO (o extender): subir al path/subcarpeta actual del visor
├── components/files/FilesBrowser.tsx     # UI de subida (input file / drag-drop) + progreso + refresco
└── lib/domain/storage/                   # (si aplica) helpers puros de config/selección de provider + tests

deploy/                                    # doc: variables y setup de Google Cloud (scope drive, redirect URI del callback)
```

**Structure Decision**: Web app single-project. El grueso es un módulo nuevo `gdrive.ts` (+`google-auth.ts`) que implementa la interfaz existente, dos endpoints de OAuth, el panel extendido y la UI de subida. Sin cambios estructurales de schema (la config vive en el `Json` de `AccessConfig`). Las llamadas a Google son server-side (route handlers), nunca desde el cliente.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nuevo provider `GoogleDriveProvider` + flujo OAuth admin | Es el corazón del feature pedido; la arquitectura ya lo previó | No hay alternativa más simple que cumpla "Drive como opción" |
| Endpoints OAuth (authorize/callback) | El refresh token requiere el flujo de consentimiento de Google una vez | Pedir client credentials sin OAuth no da acceso a Drive del admin |
| `fetch` directo a Drive REST en vez de `googleapis` | Evita una dependencia npm pesada; operaciones acotadas | `googleapis` agrega peso; se reserva como alternativa si la complejidad crece |
