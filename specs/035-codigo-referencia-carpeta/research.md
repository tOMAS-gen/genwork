# Research: Código de referencia de la carpeta del proyecto

Contexto del código existente: `Work.folderSeq Int @default(autoincrement())` (prisma), la carpeta del proyecto se crea vía la cola `CREATE_WORK_FOLDER` encolada en `src/app/api/works/route.ts:154` (payload con `workName`), y ejecutada por `provider.createWorkFolder({ scope, workName })`. La página del proyecto (`src/app/(main)/works/[id]/page.tsx`) ya recibe `folderSeq` y `group.name` en su DTO.

## R1 — Formato y normalización del código

**Decision** (de clarify): `código = NORM(nombreGrupo) + "-" + folderSeq + "-" + NORM(nombreProyecto)`, todo en MAYÚSCULAS.
- `NORM(s)` = `s.trim().toUpperCase()`, espacios (y espacios múltiples) → un `_`, y cualquier carácter no `[A-Z0-9_]` → se elimina o se convierte a `_` (determinista).
- Número = `folderSeq` **sin ceros a la izquierda** (coincide con el ejemplo del usuario "23"). 
- Grupo ausente (proyecto personal) → `PERSONAL`.
- Ejemplo: grupo "Farmacia Central", seq 23, proyecto "Mueble Living" → `FARMACIA_CENTRAL-23-MUEBLE_LIVING`.

**Rationale**: Cumple exactamente el formato pedido; determinista y estable para la parte grupo+número.

**Alternatives considered**: número con padding (`0023`) — rechazado, el usuario escribió "23"; abreviatura del grupo — rechazado, el usuario quiere el nombre completo.

## R2 — Calcular vs persistir el código

**Decision**: **Calcular** el código on-the-fly con `buildProjectCode(groupName, folderSeq, workName)`; NO agregar columna ni persistirlo.

**Rationale**: Todos los insumos ya existen en el `Work` (`folderSeq`, relación a grupo, `name`). Calcular evita una migración y mantiene el código siempre coherente con el estado actual. La parte estable (grupo+número) no cambia; el nombre refleja el actual (FR-007).

**Alternatives considered**: persistir un snapshot del código en el Work — agrega columna y riesgo de desincronización; innecesario.

## R3 — Nombre de la carpeta en el almacenamiento

**Decision**: En `POST /api/works` (`route.ts`), tras crear el `Work` (que ya tiene `folderSeq`), resolver el `groupName` (si hay grupo) y calcular el código; encolar `CREATE_WORK_FOLDER` pasando **el código como el nombre de carpeta** (`workName: code`). El proveedor (`createWorkFolder`) crea la carpeta del proyecto con ese nombre. Aplica a Google Drive y Nextcloud por igual.

**Rationale**: Mínimo cambio: el provider ya usa `workName` como nombre de la carpeta del proyecto; se le pasa el código en su lugar. Cumple "la carpeta se llama igual que el código" para proyectos nuevos (FR-005). Los existentes no se renombran (FR-006) porque su carpeta ya fue creada.

**Nota**: para scope de grupo, la carpeta del proyecto (con el código) vive dentro de la carpeta del grupo; el código incluye el nombre del grupo de nuevo, lo cual es redundante pero inequívoco al buscar.

## R4 — Mostrar en la vista del proyecto

**Decision**: `GET /api/works/[id]` incluye `code` (calculado con la función pura) en su DTO. La página del proyecto muestra un **apartado** con el código y un botón **copiar** (clipboard). Solo lectura.

**Rationale**: Una sola fuente del formato (la función pura, en el server). El cliente solo presenta. Copiar facilita pegarlo al buscar en el Drive (SC-002).

## R5 — Proyectos existentes

**Decision**: El `code` se calcula igual para proyectos viejos (tienen `folderSeq`, grupo, nombre), así que **todos** lo muestran (FR-006). Sus carpetas físicas no se renombran; puede haber divergencia entre el código mostrado y el nombre viejo de la carpeta — aceptado en clarify.

**Rationale**: Cumple mostrar el código en todos sin tocar el almacenamiento existente (sin riesgo de renombrado masivo).
