# Implementation Plan: Servidor MCP con acceso completo a Genwork

**Branch**: `039-mcp-gestion-completa` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-mcp-gestion-completa/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Exponer un servidor MCP (Model Context Protocol), servido como un Route Handler más de la
app Next.js existente (`/api/mcp`), que le da a un asistente de IA acceso a todo lo que un
usuario de Genwork puede hacer hoy desde la web: proyectos ("trabajos"), tareas, Documentación
y Adjuntos de cada trabajo, etiquetas, notas, recordatorios, favoritos, y — para usuarios con
permisos de administración — usuarios permitidos, grupos y accesos de sector. El asistente
actúa siempre como el usuario humano que lo vinculó (nunca con una identidad propia), usando
una credencial personal que el usuario genera y puede revocar en cualquier momento. Las
acciones destructivas o irreversibles exigen un paso de confirmación a nivel de protocolo
(la herramienta primero devuelve "requiere confirmación" y solo ejecuta si se la vuelve a
invocar confirmando ese pedido pendiente). Todo lo hecho vía MCP reutiliza el motor de
permisos y los modelos de datos ya existentes (sin bifurcar reglas de negocio) y queda
registrado como actividad visible en la interfaz web.

## Technical Context

**Language/Version**: TypeScript 5.8 sobre Node.js (mismo runtime que el resto de Genwork, Next.js 15 App Router).

**Primary Dependencies**: Next.js 15 (Route Handlers), Prisma 6, Zod, `@modelcontextprotocol/sdk` (nueva dependencia — implementación oficial de servidor MCP con transporte Streamable HTTP), `next-auth` 5 (solo para la sesión web que genera/revoca la credencial; el propio MCP usa su propio token, no cookies de sesión).

**Storage**: PostgreSQL vía Prisma (mismo esquema que el resto de Genwork). Se agregan 3 tablas nuevas (ver `data-model.md`): `McpConnection` (credencial vinculada + revocación), `McpConfirmation` (pedidos pendientes de confirmación con expiración corta), `McpActivityLog` (auditoría visible en la web).

**Testing**: Vitest, siguiendo la convención ya usada en `tests/unit/*` y `src/**/__tests__/*`: tests unitarios de funciones puras (parseo/armado de resultados de herramientas MCP, generación/validación/expiración de confirmaciones, mapeo de errores del motor de permisos a errores MCP). El proyecto no tiene hoy un harness de integración contra una base de datos real (ver nota en `research.md`), así que las herramientas que tocan Prisma se testean unitariamente sobre sus partes puras y se validan manualmente end-to-end vía `quickstart.md`, igual que el resto de la app.

**Target Platform**: Mismo despliegue Docker de Next.js que ya usa Genwork (sin proceso ni contenedor nuevo). El servidor MCP vive dentro del mismo proceso, como un Route Handler HTTP más.

**Project Type**: Extensión de la web app existente (no es un proyecto/servicio nuevo).

**Performance Goals**: Sin metas de throughput especiales — uso de un taller/negocio chico con pocos usuarios concurrentes. SC-004 (propagación visible en <5s) se cumple trivialmente al compartir el mismo proceso y base de datos que la interfaz web (escritura síncrona, sin cola intermedia).

**Constraints**: Reutilizar el motor de permisos existente (`src/lib/domain/permissions`) y el parser de etiquetado inline (`src/lib/domain/tags`) sin bifurcarlos; toda herramienta MCP que cree/edite una tarea DEBE poder recibir texto con etiquetas inline (`/ # @ $`) y pasar por el mismo parser que usa la web, para no crear una segunda forma de clasificar tareas (Principio II). El middleware actual (`src/middleware.ts`) exige cookie de sesión en todo `/api/*`; hay que excluir `/api/mcp` de ese gate y hacer su propia validación por token.

**Scale/Scope**: 13 grupos de herramientas MCP (proyectos, tareas, documentación, adjuntos, etiquetas, notas, recordatorios, favoritos, búsqueda, administración de usuarios/grupos/accesos, y gestión de la propia conexión MCP) sobre el modelo de datos ya existente; sin usuarios nuevos ni entidades de negocio nuevas más allá de las 3 tablas de soporte al MCP.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Resultado |
|---|---|---|
| I. Tarea única, múltiples vistas | Las herramientas MCP operan sobre los mismos `Work`/`Task` de Prisma que la web; no se crea una copia paralela de datos ni un "modo MCP" de tareas. | PASS |
| II. Etiquetado inline como interfaz primaria | Las herramientas de crear/editar tarea aceptan `rawText` con símbolos `/ # @ $` y reutilizan `src/lib/domain/tags/parser.ts` (mismo parser que la web), en vez de exigir campos estructurados separados. | PASS |
| III. Trabajo = Documentación + Tareas | El MCP expone ambas mitades del trabajo (Documentación vía `DocPage`, Tareas vía `Task`) como parte del mismo grupo de herramientas de "proyecto", nunca por separado ni en un flujo que obligue a ignorar una de las dos. | PASS |
| IV. Estados simples e historial visible | La herramienta de cambiar estado de tarea reutiliza `src/lib/domain/tasks/state.ts` (`toggleState`), que ya garantiza los dos únicos estados y el historial; el MCP no agrega estados nuevos. | PASS |
| V. Simplicidad primero (YAGNI) | Se agregan solo 3 tablas nuevas, estrictamente necesarias porque hoy Genwork no tiene ningún concepto de credencial personal, confirmación pendiente ni auditoría (ver Complexity Tracking). No se introduce una capa de "servicios" nueva que envuelva a Prisma: las herramientas MCP llaman directo a Prisma + al motor de permisos, igual de directo que ya lo hacen los route handlers REST existentes. | PASS (con justificación documentada) |

Sin violaciones sin justificar. Detalle de la única adición de complejidad en **Complexity Tracking**.

## Project Structure

### Documentation (this feature)

```text
specs/039-mcp-gestion-completa/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── mcp-tools.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       ├── mcp/
│       │   └── route.ts                # Endpoint MCP (Streamable HTTP), POST único
│       └── me/
│           └── mcp-connections/
│               ├── route.ts            # GET (listar) / POST (crear credencial nueva)
│               └── [id]/route.ts       # DELETE (revocar)
├── lib/
│   └── mcp/
│       ├── server.ts                    # Arma el McpServer y registra las herramientas
│       ├── context.ts                   # Resuelve el token Bearer → UserContext + sesión MCP
│       ├── confirmation.ts              # Crear/validar/expirar McpConfirmation
│       ├── activity.ts                  # Escribir McpActivityLog
│       ├── errors.ts                    # Mapeo de ApiError / errores de permisos → error MCP
│       └── tools/
│           ├── works.ts
│           ├── tasks.ts
│           ├── docs.ts
│           ├── attachments.ts
│           ├── labels.ts
│           ├── notes.ts
│           ├── reminders.ts
│           ├── favorites.ts
│           ├── search.ts
│           └── admin.ts                 # usuarios permitidos, grupos, accesos de sector
├── server/
│   └── mcp-auth.ts                      # requireMcpConnection(): valida Bearer y devuelve sesión
└── components/
    └── settings/
        └── McpConnectionsPanel.tsx      # Página "Asistentes conectados" (generar/revocar token)

prisma/
└── schema.prisma                        # + McpConnection, McpConfirmation, McpActivityLog

tests/unit/
├── mcp-confirmation.test.ts
├── mcp-tag-passthrough.test.ts
└── mcp-errors.test.ts
```

**Structure Decision**: Se extiende la app Next.js monolítica ya existente (no hay separación
frontend/backend en este repo). El servidor MCP es un Route Handler más bajo `src/app/api/mcp`,
y su lógica de dominio vive en `src/lib/mcp/*` junto al resto de `src/lib/domain/*`, reusando
directamente Prisma y el motor de permisos — mismo patrón que ya usan `src/app/api/works`,
`src/app/api/tasks`, etc. No se crea un paquete, servicio o proceso nuevo (Principio V).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| 3 tablas nuevas (`McpConnection`, `McpConfirmation`, `McpActivityLog`) | El spec exige (FR-009a/b) una vinculación de identidad revocable que hoy no existe en el sistema (solo hay sesión de cookie vía Google), (FR-012) confirmación de dos pasos a nivel de protocolo para acciones destructivas, y (FR-010) auditoría visible al usuario. Ninguna tabla existente cubre estos tres conceptos. | Reusar la sesión de `next-auth` para el MCP: rechazado porque un asistente de IA no puede completar el login interactivo de Google ni sostener una cookie de navegador, y no sería revocable de forma independiente del resto de sesiones del usuario. Guardar la confirmación solo en memoria del proceso: rechazado porque Next.js puede correr varias instancias/réplicas y una confirmación en memoria se perdería entre el primer y el segundo llamado a la herramienta. |
