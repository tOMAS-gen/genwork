# Research: Permisos y nombres de carpeta en Nextcloud

## R1. ¿Por qué un miembro agregado a un grupo puede quedar sin permisos en Nextcloud?

**Hallazgo**: el alta directa de miembro (`POST /api/groups/[id]/members`, `src/app/api/groups/[id]/members/route.ts`) ya encola `ADD_MEMBER` correctamente. El job (`src/lib/storage/queue.ts:68-79`) requiere que `group.nextcloudGroupId` y `user.nextcloudUserId` ya existan; si no, lanza un `Error` genérico que entra al mismo camino de reintento con backoff exponencial que un fallo real de Nextcloud (`MAX_ATTEMPTS = 10`, `BASE_DELAY_MS = 5_000`, tope ~64 minutos antes de marcar `FAILED`).

**Decisión**: no reemplazar el mecanismo de reintento (Principio V — reutilizar lo que ya funciona), pero **distinguir "dependencia todavía no lista" de "fallo real"**: mientras el job del que depende (`CREATE_GROUP_FOLDER` para el grupo, `CREATE_USER` para el usuario) siga `PENDING`, el job de permiso no debe consumir intentos de su propio presupuesto — recién empieza a contar attempts una vez que la dependencia está resuelta y el fallo persiste por otra razón. Esto evita que una carrera de creación (grupo recién creado + alta de miembro casi inmediata) queme los 10 intentos antes de que la carpeta exista.

**Alternativas consideradas**: aumentar `MAX_ATTEMPTS` o `BASE_DELAY_MS` — descartado, no distingue la causa y sigue pudiendo fallar permanentemente si la dependencia tarda más que el presupuesto ampliado; solo pospone el problema.

## R2. Visibilidad de fallos de sincronización de permisos (FR-004)

**Hallazgo**: `GET /api/admin/storage/jobs` (`src/app/api/admin/storage/jobs/route.ts`) ya lista jobs `PENDING`/`FAILED` de **cualquier** `JobKind`, protegido por `requireSuperAdmin()`, y el panel `Admin > Storage` (`src/app/(main)/admin/storage/page.tsx`) ya los renderiza con botón "Reintentar". Esto ya cumple FR-004 para cualquier kind de job existente o nuevo — no requiere cambios de UI ni de API, solo que el job de auditoría (R3) se registre como `ProvisioningJob` para heredar esta visibilidad gratis.

**Decisión**: no crear pantalla ni endpoint nuevo. La verificación periódica (FR-008) se implementa como un `ProvisioningJob` más, para que el panel existente lo muestre sin tocarlo.

## R3. Verificación diaria de permisos (FR-008)

**Decisión**: nuevo `JobKind.AUDIT_GROUP_PERMISSIONS` con payload `{ groupId }`. El job compara `GroupMembership` (genwork) contra los miembros reales del grupo Nextcloud (`storage.listGroupMembers` — método nuevo sobre `StorageProvider`, ver data-model.md). Si encuentra una diferencia, el job termina en estado `FAILED` con `lastError` describiendo la diferencia (ej. `"Diferencia de permisos: usuario X tiene acceso en genwork pero no en Nextcloud"`), reutilizando el mismo campo que ya usa el panel para mostrar errores — cero UI nueva.

Un **ticker en proceso** (`startPermissionAuditTicker`, patrón idéntico a `startQueueTicker` en `src/lib/storage/queue.ts:174-179`, iniciado junto al existente en `src/instrumentation.ts`) encola un `AUDIT_GROUP_PERMISSIONS` por cada grupo con `nextcloudGroupId` no nulo, una vez cada 24 horas.

**Alternativas consideradas**: cron externo (systemd timer / cron del SO) — descartado, la app ya tiene el patrón de ticker en proceso para el mismo dominio (colas de Nextcloud); agregar un segundo mecanismo de scheduling sería una capa nueva no justificada (Principio V).

## R4. Patrón de nombre de carpeta (FR-005/FR-007/FR-010) — corregido 2026-07-13

**Hallazgo inicial (revisado)**: `buildProjectCode(groupName, folderSeq, workName)` (`src/lib/domain/works/projectCode.ts`) genera `GRUPO-SEQ-PROYECTO` y su docstring dice ser "la única fuente de verdad del formato... se usa tanto para mostrar el código en la UI como para nombrar la carpeta al crearla" — pero eso es un docstring aspiracional/desactualizado, no una decisión de producto vigente. `formatFolderName(seq, name)` (`src/lib/storage/paths.ts:5-7`) es lo que realmente nombra la carpeta hoy (`000-Nombre`, sin grupo), y ese formato — sin el grupo — es correcto: el grupo ya es el directorio padre (`/genwork/{grupo}/{carpeta}`), repetirlo en el nombre de la carpeta es redundante. Coincide además con la decisión ya ratificada en `specs/028-nextcloud-storage` ("Q: ¿Cómo se identifican las carpetas...? → A: Número secuencial humano + nombre del proyecto").

**Decisión (corregida)**: NO se usa `buildProjectCode` para nombrar carpetas — sigue existiendo solo como código de referencia de display (UI/MCP). El único cambio real de comportamiento es que `formatFolderName` pase a devolver el resultado en minúsculas: `` `${String(seq).padStart(3, "0")}-${sanitizeSegment(name)}`.toLowerCase() ``. `computeRenamePath` no cambia de firma (sigue sin recibir `groupName`). Se corrige el docstring desactualizado de `projectCode.ts` para que dejar de afirmar que se usa para nombrar carpetas.

**Alternativas consideradas**: reemplazar `formatFolderName` por `buildProjectCode` (decisión original de este research, revertida) — descartada tras confirmar con el usuario que el grupo no debe repetirse en el nombre; estructura anidada de 3 carpetas (`Grupo/Código/Nombre`) — descartada, el grupo ya es un directorio padre.

## R5. Migración de carpetas existentes (FR-007) — corregido 2026-07-13

**Decisión**: la migración reutiliza el `JobKind.RENAME_WORK_FOLDER` que ya existe (`src/lib/storage/queue.ts:111-119`) — no se crea un `JobKind` nuevo para esto. Al arrancar el servidor, una función enumera todos los `Work` con `nextcloudFolderPath` no nulo cuyo nombre de carpeta actual no esté ya en minúsculas (formato correcto según R4), y encola un `RENAME_WORK_FOLDER` por cada uno con el `toPath` recalculado (mismo `folderSeq`, nombre en minúsculas). El mismo mecanismo de reintento/backoff ya cubre fallos transitorios de Nextcloud durante la migración. Alcance más chico que la versión anterior de este research: no hay segmento de grupo que quitar (nunca estuvo), solo normalización de mayúsculas/minúsculas.

## R6. Alcance de "acceso a un grupo" (FR-001/002/009)

Ya resuelto en Clarifications de la spec: limitado a `GroupMembership` (alta/baja directa). `SectorGrant`/`ReaderGrant` (specs 044-048) quedan fuera de alcance — no requieren research adicional para esta feature.
