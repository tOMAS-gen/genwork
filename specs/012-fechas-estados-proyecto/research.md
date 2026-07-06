# Research: Fechas y Estados Configurables de Proyecto

## R1: Campo dueDate en Work

**Decision**: El campo `dueDate DateTime?` ya existe en el modelo `Work` (schema.prisma:200). Solo falta UI y endpoint de edición.
**Rationale**: No requiere migración de datos.
**Alternatives**: Ninguna — el campo ya está.

## R2: Campo dueDate en Task

**Decision**: Agregar `dueDate DateTime?` al modelo `Task`. Se parsea desde el rawText al crear/editar y se persiste.
**Rationale**: El parser de tags ya existe y se puede extender con detección de fechas. El dueDate en Task permite filtrar y ordenar tareas por fecha.
**Alternatives**: Guardar la fecha solo en el texto sin persistir → rechazado porque no permite filtros ni ordenamiento.

## R3: Formato de fecha

**Decision**: DD/MM/AAAA y DD-MM-AAAA. Regex: `\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b`.
**Rationale**: Formato estándar argentino. Se valida con `new Date(year, month-1, day)` y se verifica que el día resultante coincida (descarta 31/02, 30/02, etc.).
**Alternatives**: ISO 8601 (YYYY-MM-DD) → rechazado, no es natural para el usuario argentino.

## R4: Modelo ProjectStage

**Decision**: Nueva tabla `ProjectStage` con campos: id, name, color (nullable), sortOrder, groupId. Relación 1:N con Work vía `stageId` (nullable).
**Rationale**: Los stages pertenecen a un grupo (organización), no son globales. El sortOrder permite reordenar.
**Alternatives**: Enum hardcodeado → rechazado, el usuario quiere configurar sus propios estados.

## R5: Selector de fecha nativo vs. custom

**Decision**: Usar `<input type="date">` del navegador para la fecha de entrega del proyecto. Para tareas, la fecha se escribe inline (no hay selector).
**Rationale**: El input nativo es suficiente para una fecha de proyecto; no amerita un datepicker custom. En tareas, la escritura inline es consistente con el Principio II.

## R6: Admin de stages

**Decision**: Nueva página `/admin/stages` con CRUD de estados. Patrón similar a `/admin/labels`.
**Rationale**: Ya existe el patrón de admin (labels, users, access, storage). Se replica el mismo layout.
