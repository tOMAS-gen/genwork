# Research: Renombrar Proyectos, Sectores y Grupos

## Decisión 1: Componente único `RenameDialog` reutilizable

- **Decision**: crear `src/components/ui/RenameDialog.tsx`, un modal genérico que recibe
  `open`, `onClose`, `title`, `label` (nombre de la entidad para copy), `initialName`,
  `maxLength`, y `onSave(name: string): Promise<void>`. Internamente usa `Dialog` +
  `useState` + `useToast`, igual patrón que `ProjectMenu`'s dialogs de Archivar/Eliminar.
- **Rationale**: Principio V (YAGNI) — una sola implementación evita triplicar lógica de
  validación de UI (vacío, largo, error de red) casi idéntica en las 3 páginas.
- **Alternatives considered**: edición inline en el `<h1>` de cada página (rechazada por
  la decisión de Clarify: modal, no inline) — implementar el modal 3 veces duplicado en
  cada página (rechazado por Principio V).

## Decisión 2: Cómo la UI de Sector sabe si el usuario es SUPERADMIN

- **Decision**: extender `GET /api/me` (`src/app/api/me/route.ts`) para incluir
  `globalRole` (`session.user.globalRole`) además de `id`. `SectorPage` hace el mismo
  fetch que ya usa `GroupDetailPage` para calcular `isGroupAdmin`, y calcula
  `isSuperAdmin = me.globalRole === "SUPERADMIN"` client-side para decidir si muestra el
  ítem "Renombrar sector" en el `Menu`.
- **Rationale**: la regla de dominio (constitución v1.5.0) es que SOLO SUPERADMIN
  administra un sector ya creado, sin importar el ámbito — `view.level === "operate"`
  (ya usado para "Eliminar sector") refleja acceso operativo vía `SectorGrant`, que
  puede alcanzar a un ADMIN de grupo sin ser SUPERADMIN. Ocultar "Renombrar…" requiere
  el rol global real, no el nivel de acceso al sector. El backend (`PATCH
  /api/sectors/[id]`) ya exige `requireSuperAdmin()`, así que esta es una mejora de UX
  (ocultar lo que fallaría), no una nueva regla de autorización.
- **Alternatives considered**: agregar el chequeo directamente en la respuesta de `GET
  /api/sectors/[id]/tasks` (ej. campo `canRename`) — descartada porque `/api/me` ya es el
  punto de extensión usado por el patrón existente (`GroupDetailPage`) y evita acoplar el
  endpoint de tareas de sector a una concern de permisos de otra entidad.

## Decisión 3: Alcance de FR-007 (renombrado de carpeta Nextcloud del proyecto)

- **Decision**: no requiere cambio de código — el `PATCH /api/works/[id]` ya encola
  `RENAME_WORK_FOLDER` cuando `name` cambia (`computeRenamePath`), sea cual sea el origen
  de la petición (UI nueva, MCP, o cualquier cliente). La UI nueva simplemente llama al
  mismo endpoint.
- **Rationale**: Principio V — cero lógica nueva de storage.

## Decisión 4: Cómo la UI de Proyecto sabe si el usuario tiene acceso de operación

- **Decision**: extender `GET /api/works/[id]` (`src/app/api/works/[id]/route.ts`) para
  incluir `access: "read" | "operate"` en la respuesta, usando el `level` que
  `getWorkWithAccess` ya calcula internamente (hoy se calcula pero no se expone).
  `WorkPage` pasa `canRename={access === "operate"}` a `ProjectMenu`, que oculta el ítem
  "Renombrar…" (y, de paso, deja preparado el mismo criterio para Archivar/Eliminar, hoy
  visibles incluso a lectores).
- **Rationale**: FR-008 y el Acceptance Scenario 2 de US1 exigen que un lector no vea el
  control de renombrado. Hoy `WorkFull` (la interfaz que consume `WorkPage`) no expone
  ningún nivel de acceso, a diferencia de `Sector` (que ya expone `level` en `GET
  /api/sectors/[id]/tasks`) y de `Group` (que expone `memberships` para calcular
  `isGroupAdmin` client-side). Sin este campo, `ProjectMenu` no puede condicionar
  correctamente el ítem nuevo.
- **Alternatives considered**: agregar un endpoint separado tipo `GET
  /api/works/[id]/access` — descartado por Principio V (YAGNI): más simple sumar un
  campo a la respuesta que ya existe que crear un endpoint nuevo.
