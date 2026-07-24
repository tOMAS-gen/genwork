# Implementation Plan: Mejoras de grupos y archivos (lote Tareas globales)

**Branch**: `054-mejoras-grupos-archivos` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/054-mejoras-grupos-archivos/spec.md`

## Summary

Cinco mejoras independientes alrededor de grupos y archivos: (1) la carpeta de storage de un proyecto deja de crearse automáticamente y pasa a habilitarse bajo demanda por el ADMIN del grupo (o dueño en personales), con re-sincronización inmediata de permisos ante cambios de membresía; (2) la vista de un grupo corrige el filtrado de proyectos (hoy `GET /api/works` ignora `?groupId=`); (3) el dashboard suma filtro de proyectos por grupo y rediseño del control de filtros; (4) el drawer muestra "Grupo — Proyecto"; (5) el servidor MCP expone `group_list`.

Enfoque técnico: reutilizar la infraestructura existente de cola (`ProvisioningJob`), providers (`nextcloud.ts`/`gdrive.ts`) y auditoría de permisos (053). Un solo campo nuevo en Prisma (`Work.folderEnabledAt`); sin entidades nuevas.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥20

**Primary Dependencies**: Next.js (App Router), Prisma ORM, @modelcontextprotocol/sdk (server MCP), Zod; Nextcloud vía OCS/WebDAV, Google Drive vía googleapis

**Storage**: PostgreSQL (Prisma); archivos en Nextcloud (group folders) o Google Drive según `AccessConfig.storageProvider`

**Testing**: Vitest (`npm test`), ESLint (`npm run lint`), `next build`

**Target Platform**: Servidor web self-hosted (dev en :3010)

**Project Type**: Aplicación web única (Next.js fullstack: UI + API routes + MCP endpoint)

**Performance Goals**: Sin metas nuevas; jobs de storage asíncronos con la cola existente (reintentos, backoff)

**Constraints**: La habilitación de carpeta debe ser idempotente; el resync de permisos debe converger aunque el job falle (auditoría diaria 053 como red); Drive no gestiona miembros (acceso intermediado por la plataforma — no-op documentado)

**Scale/Scope**: 5 user stories; ~1 migración Prisma, ~1 endpoint nuevo, ~1 tool MCP nueva, 3 ajustes de UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|-----------|------------|
| I. Tarea única, múltiples vistas | ✅ No se tocan tareas ni vistas de tareas. |
| II. Etiquetado inline | ✅ Sin cambios al parser ni a la semántica `/ # @ $`. |
| III. Trabajo = Documentación + Tareas | ✅ El apartado Archivos sigue dentro del trabajo; solo cambia su estado inicial (sin carpeta → acción de habilitar). |
| IV. Completado binario | ✅ No se tocan estados de tareas. |
| V. Simplicidad (YAGNI) | ✅ Un campo nuevo (`Work.folderEnabledAt`), cero entidades nuevas, se reutilizan cola/jobs/auditoría existentes. Sin "deshabilitar carpeta" en v1. |
| Regla de dominio: administración por SUPERADMIN/ADMIN | ✅ "Habilitar carpeta" restringida a ADMIN de grupo / SUPERADMIN / dueño (clarificación de sesión 2026-07-14), coherente con la distribución de permisos por ámbito. |

**Gate: PASS** (pre-research y post-diseño). Sin violaciones → Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/054-mejoras-grupos-archivos/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── api.md           # Contratos REST + MCP
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # Work.folderEnabledAt (nuevo campo)
└── migrations/2026XXXX_work_folder_on_demand/

src/
├── app/api/works/route.ts                 # POST: quitar enqueue CREATE_WORK_FOLDER; GET: soportar ?groupId= y devolver groupName
├── app/api/works/[id]/files/route.ts      # GET: exponer folderEnabled + canEnableFolder
├── app/api/works/[id]/files/enable/route.ts  # NUEVO: POST habilitar carpeta (guard ADMIN/dueño, idempotente)
├── app/api/groups/[id]/members/route.ts   # POST alta: + enqueue AUDIT_GROUP_PERMISSIONS inmediato
├── app/api/groups/[id]/members/[userId]/route.ts  # DELETE baja: idem
├── app/(main)/page.tsx                    # filtro por grupo en filterProjects
├── app/(main)/groups/[id]/page.tsx        # consume el groupId ya corregido en la API
├── components/dashboard/FilterBar.tsx     # filtro por grupo + rediseño pills
├── components/files/FilesBrowser.tsx      # estado "sin carpeta": botón Habilitar / aviso
├── components/nav/DrawerNav.tsx           # "Grupo — Proyecto" (personales sin prefijo)
├── lib/storage/queue.ts                   # CREATE_WORK_FOLDER marca folderEnabledAt-aware; jobs toleran work sin carpeta
└── lib/mcp/
    ├── server.ts                          # registrar registerGroupTools
    └── tools/
        ├── works.ts                       # work.create: quitar enqueue automático
        └── groups.ts                      # NUEVO: tool group.list

tests/unit/
├── storage-folder-enable.test.ts          # NUEVO: habilitación idempotente + guard
├── works-group-filter.test.ts             # NUEVO: GET /api/works?groupId=
└── mcp-group-list.test.ts                 # NUEVO: visibilidad por rol
```

**Structure Decision**: proyecto único Next.js existente; se modifican rutas y componentes en su lugar, sin nuevos paquetes ni capas.

## Complexity Tracking

Sin violaciones a la constitution — tabla vacía.
