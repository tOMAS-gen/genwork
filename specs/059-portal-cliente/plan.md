# Implementation Plan — 059 Portal de cliente

## Summary

Rol `CLIENT` nuevo, sin acceso por ámbito, cuya única vía de lectura es un otorgamiento explícito por proyecto (`ClientWorkGrant`). Portal propio en `/portal` con listado de proyectos y detalle con Tareas, Documentos y Actividad, servido por un namespace de API dedicado y de solo lectura. Superficie interna cerrada por deny-by-default en tres capas.

## Technical Context

- Next.js 15 App Router, React 19, Prisma 6 + PostgreSQL, Auth.js v5 (JWT, Google OAuth), Zod, Vitest 3.
- Sin cambios de dependencias. Sin backends de almacenamiento nuevos.
- Migraciones aditivas (tres archivos, DDL y backfill separados).

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| **I. Information at a Glance** | El portal muestra avance, estado y fecha sin clicks: la tarjeta de proyecto trae el porcentaje y el contador de tareas; el detalle trae la barra de progreso arriba. El chip permanente "Vista de cliente · solo lectura" comunica el estado de la sesión sin que el usuario tenga que descubrirlo. Los contadores se derivan de la misma fuente que la vista interna (`progress()` sobre las tareas del proyecto). |
| **II. Opinionated over Flexible** | Cero configuración de usuario: no hay marcado de tareas visibles/ocultas (se ven todas), no hay elección de secciones, no hay filtro de archivados (no se listan). El producto decide. |
| **III. Spec-Driven Delivery** | Esta carpeta: spec, plan, research, data-model, contracts, quickstart, tasks, checklist. Rama `059-portal-cliente`. |
| **IV. Design System Consistency** | El portal reusa las clases existentes (`.task`, `.tag`, `.label-chip`, `.project-card`, `.pc-*`, `.task-status-pill`) y los primitivos `ProgressBar`, `ProjectTabs`, `Skeleton`, `EmptyState`. Las clases nuevas necesarias para el shell del portal se agregan en `globals.css` con los tokens existentes, no dentro de los componentes. |
| **V. Accessibility WCAG AA** | Pestañas con roles y foco visible; chips de estado que no comunican solo por color (llevan el nombre del estado como texto); contraste verificado en tema claro y oscuro; el portal hereda el `data-theme` global. |
| **VI. Test-Backed Changes** | Tests puros del motor de permisos (incluida una propiedad: un cliente nunca obtiene `operate`), tests de forma de los DTO por ausencia de claves prohibidas, contract tests de las rutas nuevas, y una suite negativa de seguridad que se escribe **antes** de tocar los guards. |
| **VII. Perceived Speed & Observability** | `getUserContext` suma una única consulta indexada por clave primaria, en paralelo con las existentes: el perfil de latencia de las rutas internas no cambia. Listado y detalle resuelven en una consulta con `include`, sin N+1. Skeletons en ambas pantallas del portal. Los errores siguen pasando por `withApi`, así que quedan en `ErrorLog`. |

**Migraciones destructivas**: ninguna. Las tres son aditivas.

## Project Structure

### Documentación

```
specs/059-portal-cliente/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/portal-api.md
└── checklists/requirements.md
```

### Código

**Datos y motor**
- `prisma/schema.prisma` — `CLIENT`, `ClientWorkGrant`, `User.firstLoginAt`
- `prisma/migrations/20260814100000_client_role_enum/`, `…100100_client_work_grant/`, `…100200_backfill_first_login/`
- `src/lib/domain/permissions/index.ts` — corte de CLIENT, `isWriterRole`, `accessWork`, `canClientRead`
- `src/server/user-context.ts` — `clientWorkIds`

**Guards y cierre de superficie**
- `src/server/guards.ts` — `requireWriter` por allowlist, `requireInternal`, `requireClient`, `requireClientWork`
- `src/server/works.ts` (nuevo) — `getWorkWithAccess` extraído
- `src/lib/domain/access/portalPaths.ts` (nuevo) + `src/middleware.ts`
- `src/server/mcp-auth.ts`, `src/lib/storage/queue.ts`, `src/server/auth.ts`
- `src/app/(main)/admin/layout.tsx` (nuevo), `src/app/(main)/layout.tsx`, `src/app/tv/page.tsx`
- ~25 rutas de `src/app/api/**` — `requireSession` → `requireInternal`

**Administración**
- `src/app/api/admin/clients/route.ts`, `src/app/api/admin/clients/[userId]/route.ts`
- `src/app/api/works/[id]/client-grants/route.ts`, `…/client-grants/[userId]/route.ts`, `…/client-candidates/route.ts`
- `src/app/(main)/admin/clients/page.tsx`, `src/components/works/ClientAccessPanel.tsx`

**Portal**
- `src/server/portal.ts` (nuevo) — proyecciones y consultas
- `src/app/api/portal/works/route.ts`, `…/works/[id]/route.ts`, `…/works/[id]/activity/route.ts`, `…/stream/route.ts`
- `src/app/portal/layout.tsx`, `src/app/portal/page.tsx`, `src/app/portal/works/[id]/page.tsx`
- `src/components/portal/` — `PortalShell`, `PortalProjectCard`, `PortalTaskItem`, `PortalStatusBar`, `PortalActivityFeed`

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `getToken` de `next-auth/jwt` podría no empaquetarse en el runtime del borde | Plan B: dejar el gate del borde solo para `/api/*`, o quitarlo. Las capas de guards y de motor bastan para los datos; el borde es defensa en profundidad y experiencia de uso. |
| Token con rol viejo | Refresco con vencimiento de 60 s + prohibición de convertir internos en clientes. |
| Conexión SSE con otorgamientos capturados al conectar | Cierre a los 15 minutos; el navegador reconecta y re-autoriza. |
| La fila del cliente aparece en superficies internas | Allowlist positiva de roles en los cuatro puntos de enumeración. |
