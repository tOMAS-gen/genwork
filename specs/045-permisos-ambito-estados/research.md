# Research: Permisos de ámbito en estados de tarea

Sin `NEEDS CLARIFICATION` pendientes en el Technical Context — el stack, el patrón de permisos y el punto de integración ya existen en el repo. Este documento registra las decisiones de diseño tomadas para cerrar el gap frontend/backend descrito en el Summary del plan.

## Decisión 1: Dónde calcular `canWrite`

- **Decision**: Calcular `canWrite` dentro del handler `GET /api/task-statuses` (`src/app/api/task-statuses/route.ts`), reutilizando `resolveScopeAndAuthorize` con `requireWrite` evaluado sin lanzar excepción (o una variante que devuelva el booleano en vez de tirar `forbidden`).
- **Rationale**: La autorización de escritura para POST ya vive ahí (`resolveScopeAndAuthorize(ctx, params, true)`), apoyada en `access`/`accessSector`/`canManageGroup` de `src/lib/domain/permissions/index.ts`. Reutilizarla evita duplicar reglas de permisos en dos lugares (violaría el principio V, Simplicidad/YAGNI, y crearía riesgo de que backend y frontend queden desincronizados).
- **Alternatives considered**:
  - Exponer `UserContext` completo (roles, `adminGroupIds`, etc.) al cliente vía `/api/me` y replicar la lógica de `access`/`canManageGroup` en el frontend → rechazado: duplica lógica de dominio en dos capas, mayor superficie de bugs, y filtra más información de la necesaria (ids de todos los grupos donde es admin) solo para decidir un booleano de una pantalla.
  - Endpoint separado `GET /api/task-statuses/can-write?scope=...` → rechazado: una llamada extra por carga de pantalla para un dato que ya se puede calcular junto al `GET` existente (mismo patrón que el flag `inherited`, que ya viaja en la misma respuesta).

## Decisión 2: Cómo evitar que `resolveScopeAndAuthorize` lance el error al solo querer *consultar* el permiso

- **Decision**: Introducir una función interna que separe "resolver el scope" de "autorizar la escritura", devolviendo `{ scope, canWrite: boolean }` en vez de lanzar `forbidden` cuando `requireWrite` es true y no hay permiso. El handler `POST` sigue lanzando `forbidden` explícitamente si `canWrite` es `false` (mismo comportamiento actual, sin regresión); el handler `GET` usa el mismo booleano solo para informarlo en la respuesta.
- **Rationale**: Mantiene una única fuente de verdad para "¿puede escribir este scope?" sin cambiar el comportamiento de rechazo ya validado en `POST`/`PATCH`/`DELETE` (defensa en profundidad, FR-008).
- **Alternatives considered**: Duplicar el `try/catch` alrededor de `resolveScopeAndAuthorize(ctx, params, true)` dentro del GET, capturando el `forbidden` para convertirlo en `canWrite: false` → rechazado: funciona, pero usar excepciones para control de flujo no-excepcional es menos claro que devolver el booleano directamente; se prefiere la función que retorna el booleano.

## Decisión 3: Alcance del ocultamiento en la UI

- **Decision** (ya fijada en Clarify): ocultar por completo los controles de crear/editar/reordenar/eliminar en `TaskStatusSettings.tsx` cuando `canWrite` es `false`, sin mostrarlos deshabilitados ni con mensaje explicativo.
- **Rationale**: Decisión de UX ya tomada con el usuario en la fase de clarificación (ver spec.md → Clarifications).

## Decisión 4: Qué pasa con la vista de solo lectura cuando `canWrite` es `false`

- **Decision**: El listado de estados (`GET`) sigue devolviendo los datos igual que hoy; solo cambia si el componente renderiza o no los controles de edición. No se agrega ningún mensaje ni badge de "solo lectura" — la ausencia de controles ya comunica el estado (consistente con FR-006/FR-007 y la decisión de ocultar, no deshabilitar).
- **Rationale**: Mantiene el cambio acotado a lo pedido; no inventa una nueva superficie de UI no solicitada por el usuario (Simplicidad/YAGNI).
