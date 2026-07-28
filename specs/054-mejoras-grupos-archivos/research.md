# Research: Mejoras de grupos y archivos (054)

Fase 0 — decisiones técnicas. No quedaron `NEEDS CLARIFICATION` en el Technical Context; este documento fija las decisiones de diseño con su rationale, sobre el mapa real del código.

## D1. Cómo representar "carpeta habilitada"

- **Decision**: nuevo campo `Work.folderEnabledAt DateTime?`. `null` = carpeta no habilitada. Al habilitar se setea y se encola `CREATE_WORK_FOLDER`. `nextcloudFolderPath` sigue siendo la señal de "carpeta ya creada".
- **Rationale**: hoy `nextcloudFolderPath` es `null` tanto para "sin carpeta" como para "carpeta encolada pero aún no creada" (la crea el worker asíncrono, `src/lib/storage/queue.ts:93`). Se necesita distinguir tres estados: no habilitada / habilitada creándose / creada. Un timestamp es más útil que un boolean (audita cuándo se habilitó) al mismo costo.
- **Alternatives considered**: (a) inferir "creándose" consultando jobs `PENDING` — frágil, acopla UI a la cola; (b) boolean `folderEnabled` — pierde el dato de cuándo; (c) enum de estado — sobredimensionado (YAGNI), el par `folderEnabledAt`/`nextcloudFolderPath` ya codifica los tres estados.

## D2. Migración de proyectos existentes

- **Decision**: la migración SQL marca `folderEnabledAt = "createdAt"` en todo Work con `nextcloudFolderPath IS NOT NULL`. Works existentes con path `null` (carpeta nunca creada o job fallido) quedan como "no habilitada".
- **Rationale**: cumple FR-006 (lo existente no cambia de comportamiento) sin tocar el storage. Los works viejos sin carpeta pasan naturalmente al flujo nuevo: el ADMIN la habilita si hace falta.
- **Alternatives considered**: marcar todos los works existentes como habilitados — crearía carpetas para proyectos que nunca las usaron en el próximo rename/move, justo lo que la feature elimina.

## D3. Dónde cortar la creación automática

- **Decision**: quitar el `enqueue({kind:"CREATE_WORK_FOLDER"})` de `POST /api/works` (`src/app/api/works/route.ts:167`) y de la tool MCP `work.create` (`src/lib/mcp/tools/works.ts:179`). El único punto que encola creación pasa a ser el endpoint nuevo de habilitación.
- **Rationale**: son los dos únicos productores del job según el mapa del código; centralizar la creación en un solo endpoint hace la idempotencia verificable.
- **Alternatives considered**: dejar el enqueue condicionado a un flag de request — superficie de API más compleja sin caso de uso.

## D4. Endpoint de habilitación e idempotencia

- **Decision**: `POST /api/works/[id]/files/enable`. Guard: SUPERADMIN, o ADMIN del grupo del work (`GroupMembership.role = ADMIN`), o dueño si el work es personal (`groupId null` → `ownerId`). Lógica: si `folderEnabledAt != null` → 200 con estado actual (no re-encola si ya hay job pendiente o carpeta creada); si no → setear `folderEnabledAt` y `enqueue(CREATE_WORK_FOLDER)`. La respuesta incluye `{ folderEnabled, folderCreated }`.
- **Rationale**: la cola ya deduplica y reintenta (backoff, `MAX_ATTEMPTS=10`); la condición sobre `folderEnabledAt` en transacción evita doble encolado ante dos clics simultáneos (edge case de la spec).
- **Alternatives considered**: reutilizar `POST .../files/folder` (crea subcarpetas) con un modo especial — mezcla semánticas y guards distintos (ADMIN vs cualquier usuario con acceso).

## D5. Resync de permisos ante cambios de membresía

- **Decision**: mantener los jobs existentes `ADD_MEMBER`/`REMOVE_MEMBER` (que agregan/quitan al usuario del grupo Nextcloud, con lo que el acceso a la group folder y sus carpetas de proyecto se propaga solo) y **además** encolar `AUDIT_GROUP_PERMISSIONS` del grupo inmediatamente después de cada alta/baja, como verificación de convergencia. En Google Drive `addMember`/`removeMember` son no-op por diseño (acceso intermediado por la plataforma, `src/lib/storage/gdrive.ts:7`): se documenta, no se simula.
- **Rationale**: en Nextcloud el modelo grupo-nativo ya implementa FR-005; el gap real era detección de divergencia, y la auditoría (053) ya sabe compararla — encolarla al momento del cambio la convierte de "diaria" a "inmediata" sin código nuevo de sincronización. YAGNI.
- **Alternatives considered**: recorrer todas las carpetas del grupo re-aplicando shares una a una — duplica lo que Nextcloud hace por pertenencia a grupo y multiplica llamadas OCS.

## D6. Bug de filtrado por grupo (US2)

- **Decision**: `GET /api/works` lee `?groupId=` y lo aplica al `where` (validando que el usuario vea ese grupo), igual que ya hace la tool MCP `work.list` (`src/lib/mcp/tools/works.ts:64-73`).
- **Rationale**: la vista `groups/[id]/page.tsx:60` ya pide `/api/works?groupId=${id}`; el fix es cerrar la discrepancia REST↔MCP en el único lado que falta.
- **Alternatives considered**: filtrar client-side en la página del grupo — deja la API mintiendo y repite el bug en el próximo consumidor.

## D7. Filtro por grupo en dashboard + pills (US3)

- **Decision**: agregar `groupId` (multi-select) a `DashboardFilters`/`FilterBar.tsx` y aplicarlo en `filterProjects` (`src/app/(main)/page.tsx:32`), client-side sobre los works ya visibles (que ahora traen `groupId`/`groupName` en la respuesta de `/api/works`). Rediseño de pills con radio bajo (~6–8px) y estados activo/inactivo + botón "Limpiar filtros", reutilizando los tokens de estilo existentes de la app.
- **Rationale**: los grupos ya se cargan en el dashboard; filtrar client-side es consistente con los filtros actuales (texto, sector, label, status) y evita otra ida a la API. Pills rectangulares = preferencia de diseño registrada del usuario.
- **Alternatives considered**: filtro server-side — inconsistente con el patrón actual del dashboard y sin beneficio a la escala del producto.

## D8. Drawer "Grupo — Proyecto" (US4)

- **Decision**: `GET /api/works` incluye `groupName` (ya carga la relación para el código de proyecto); `DrawerNav.tsx` amplía `WorkItem` con `groupName?` y renderiza `"{groupName} — {name}"` cuando existe, con truncado CSS para nombres largos.
- **Rationale**: los sectores del drawer ya muestran su grupo (`scope.groupName`); se replica el patrón.
- **Alternatives considered**: segunda llamada a `/api/groups` y join client-side — innecesario, la API ya tiene el dato a un select de distancia.

## D9. Tool MCP `group_list` (US5)

- **Decision**: nuevo `src/lib/mcp/tools/groups.ts` con `server.registerTool("group.list", ...)` registrado en `createMcpServer` (`src/lib/mcp/server.ts:25`). Devuelve `{ groups: [{ id, name, role }] }`: para usuario normal, sus `GroupMembership` (role ADMIN/MEMBER); para SUPERADMIN (`ctx.userContext.globalRole`), todos los grupos (role = su membership o `null`). Test unitario del handler con visibilidad por rol.
- **Rationale**: sigue el patrón exacto de registro de tools existente (nombres con punto: `work.list` → `group.list`) y los helpers de rol de `admin.ts`.
- **Alternatives considered**: exponer grupos dentro de `work.list` — no resuelve el caso "grupo sin proyectos" ni da el rol del usuario.

## D10. Jobs que asumen carpeta existente

- **Decision**: los jobs `MOVE_WORK_FOLDER`, `RENAME_WORK_FOLDER`, `DELETE_WORK_FOLDER` y la migración de nombres (`folderNameMigration.ts`) hacen skip limpio cuando `nextcloudFolderPath` es `null` (la mayoría ya filtra por path; se verifica y cubre con tests el resto).
- **Rationale**: con carpetas bajo demanda, works sin carpeta serán lo normal; archivar/renombrar/borrar un proyecto sin carpeta no debe fallar ni encolar trabajo de storage (FR-008).
- **Alternatives considered**: crear la carpeta on-the-fly en esos jobs — contradice la habilitación explícita del ADMIN.
