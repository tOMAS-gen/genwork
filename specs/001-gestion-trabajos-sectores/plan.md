# Implementation Plan: Gestión de trabajos por cliente y sector con etiquetado inline

**Branch**: `001-gestion-trabajos-sectores` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-gestion-trabajos-sectores/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

genwork: gestor de trabajos multiusuario donde cada trabajo (cliente) tiene documentación estilo
Notion + checklist, y las tareas se clasifican con etiquetas inline (`/trabajo`, `#sector`,
`@referencia`) que las hacen visibles por cliente y por sector a la vez. Acceso con Google,
permisos por grupos, archivos en una mini nube conectable (Nextcloud por defecto, Google Drive
como alternativa) con sync de escritorio, archivado como paquete portable descargable y
actualización en vivo en todas las vistas (incluido dashboard para TV).

Enfoque técnico: aplicación fullstack única en Next.js + TypeScript + PostgreSQL (Prisma),
Nextcloud como servicio hermano en docker-compose detrás de una interfaz `StorageProvider`
(OCS API + WebDAV), Auth.js para Google OAuth, TipTap para el editor, SSE global para vivo.
Detalle y alternativas en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS

**Primary Dependencies**: Next.js 14+ (App Router), Prisma, Auth.js (NextAuth v5, provider
Google), TipTap (editor + Mention), cliente WebDAV (`webdav`), `archiver` (paquete ZIP de
export), Zod (validación). `googleapis` solo si se implementa el proveedor de almacenamiento
Google Drive (R11)

**Storage**: PostgreSQL 16 (datos de genwork; instancia compartida con la database de
Nextcloud). Archivos binarios: Nextcloud (Group Folders + WebDAV)

**Testing**: Vitest (dominio: parser de etiquetas, permisos, vistas, archivado con mocks);
Playwright smoke e2e opcional

**Target Platform**: Servidor Linux self-hosted vía docker-compose (genwork + postgres +
nextcloud + caddy); clientes: navegador de escritorio/móvil y TV; sync de archivos con cliente
oficial de Nextcloud

**Project Type**: Web application (fullstack en un solo proyecto Next.js)

**Performance Goals**: Vistas y filtros < 1 s percibido con cientos de tareas; cambios de otros
usuarios visibles en toda vista abierta < 5 s (SSE global); autocompletado de etiquetas < 150 ms

**Constraints**: Self-hosted; único método de login = Google; sin pérdida de datos al archivar
(operación verificada antes de remover); Nextcloud puede estar temporalmente caído →
aprovisionamiento idempotente con reintentos

**Scale/Scope**: < 30 usuarios, decenas de trabajos activos, cientos-miles de tareas; 7 user
stories, ~8 pantallas (login, home, trabajo, sector, grupo, panel admin, dashboard TV, módulo
conexión)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento en el diseño | Estado |
|---|---|---|
| I. Tarea única, múltiples vistas | Tabla `Task` única + tabla de vínculos tipados `TaskLink`; las vistas (trabajo/sector/dashboard) son consultas, nunca copias. Completar = un UPDATE sobre la misma fila. | ✅ |
| II. Etiquetado inline como interfaz primaria | Tokenizer en `src/lib/domain/tags/` + Mention de TipTap; vínculos resueltos a IDs de entidad, no texto; escape para literales. | ✅ |
| III. Trabajo = Documentación + Tareas | Página de trabajo única: editor TipTap arriba, checklist abajo; sin navegación intermedia. | ✅ |
| IV. Estados simples e historial visible | Enum de dos estados `PENDING/DONE`; realizadas visibles tachadas; completado permitido solo vía sector de ejecución `#` (regla en motor de permisos). | ✅ |
| V. Simplicidad primero (YAGNI) | Un framework, un lenguaje; SSE en vez de WebSocket; sin microservicios. Complejidad no trivial (Nextcloud, Postgres) justificada abajo. | ✅ |
| Flujo de desarrollo (tests core) | Parser, permisos, vistas/filtros y archivado con Vitest antes de dar por completos. | ✅ |

**Re-check post Phase 1**: ✅ — el data model mantiene una sola entidad Task con vínculos
tipados; no aparecieron entidades duplicadas ni sincronizaciones entre vistas.

## Project Structure

### Documentation (this feature)

```text
specs/001-gestion-trabajos-sectores/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/                        # Next.js App Router
│   ├── (auth)/login/           # Ingreso con Google
│   ├── (main)/                 # Shell autenticado
│   │   ├── works/[id]/         # Página de trabajo (doc + tareas)
│   │   ├── sectors/[id]/       # Vista de sector
│   │   ├── groups/[id]/        # Administración de grupo
│   │   └── admin/              # Panel super-admin (acceso, Drive, Nextcloud)
│   ├── board/                  # Dashboard TV (rol Lector)
│   └── api/                    # Route handlers (contrato en contracts/api.md)
├── lib/
│   ├── domain/                 # LÓGICA CORE PURA — testeada con Vitest
│   │   ├── tags/               # Tokenizer y resolución de etiquetas / # @
│   │   ├── permissions/        # ¿Puede el usuario X operar en Y?
│   │   ├── views/              # Resolución de vistas y filtros
│   │   └── archive/            # Armado del paquete de archivado
│   ├── storage/                # Interfaz StorageProvider + NextcloudProvider (OCS/WebDAV)
│   │                           #   + cola de aprovisionamiento; GoogleDriveProvider en v1.x
│   └── db/                     # Prisma client y repositorios
├── components/                 # UI (editor TipTap, checklist, tag-input, board)
└── server/                     # Auth.js config, SSE hub

prisma/
└── schema.prisma

tests/
├── unit/                       # Espejo de src/lib/domain/
└── e2e/                        # Playwright smoke (opcional)

deploy/
├── docker-compose.yml          # genwork + postgres + nextcloud + caddy
└── .env.example
```

**Structure Decision**: Web application fullstack en un solo proyecto Next.js. La lógica de
dominio vive aislada en `src/lib/domain/` (funciones puras, sin imports de Next/Prisma) para
cumplir el mandato de tests de la constitution; el almacenamiento queda detrás de la interfaz
`StorageProvider` en `src/lib/storage/` (Nextcloud default, Google Drive como proveedor
alternativo futuro sin tocar el dominio).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nextcloud como servicio adicional | FR-033/034/035: cuentas espejo, carpetas de grupo compartidas y sync de escritorio — requisito explícito del usuario | Filesystem/MinIO gestionado por la app: sin cliente de sincronización de escritorio (requisito duro); construir sync propio sería órdenes de magnitud más complejo |
| PostgreSQL en vez de SQLite | Multiusuario concurrente; Nextcloud ya exige una DB en el compose — misma instancia, costo marginal cero | SQLite: evitaría el servicio solo en apariencia (Nextcloud igual necesita Postgres/MySQL); migración futura costosa |
| Cola de aprovisionamiento (reintentos Nextcloud) | Nextcloud puede estar caído al crear usuario/grupo; sin cola se pierde la consistencia genwork↔nube | Llamada directa sin reintento: dejaría usuarios sin carpeta de forma silenciosa, rompiendo FR-033/034 |
