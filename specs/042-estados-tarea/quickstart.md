# Quickstart: Estados de Tarea Configurables

Guía de validación end-to-end una vez implementada la feature. No es un runbook de producción;
asume entorno de desarrollo local (`npm run dev`, DB con `npm run db:migrate:dev` ya aplicada).

## Prerrequisitos

- Migración `task_status` aplicada (`npx prisma migrate dev` desde `prisma/`).
- Al menos un `Group` con dos `Sector` (uno que va a quedar en el default general, otro que se
  va a adaptar) y algunas tareas de prueba en distintos estados viejos (Pendiente/Hecha).
- Sesión iniciada como usuario con rol `ADMIN` del grupo (para probar edición del conjunto
  general) y como usuario con acceso `operate` a un sector (para probar edición de sector).

## Escenario 1 — Migración sin pérdida de datos (SC-003)

1. Antes de migrar: anotar cantidad de tareas totales y cuántas están `DONE` en un proyecto de
   prueba (`SELECT COUNT(*) FROM "Task" WHERE state = 'DONE'` si todavía existe la columna
   vieja, o desde la UI).
2. Aplicar la migración.
3. Verificar en la UI que el mismo proyecto muestra la misma cantidad total de tareas, y que
   las que estaban tachadas ("Hecha") lo siguen estando.
4. **Esperado**: 0 tareas perdidas, 0 cambios de texto/fecha/etiquetas — solo el estado pasa a
   referenciar el nuevo `TaskStatus` "Pendiente" o "Hecha" default.

## Escenario 2 — Definir un conjunto de estados por sector (US1)

1. Como admin del grupo, ir a la configuración de estados del sector "Metalúrgica".
2. Agregar 3 estados `IN_PROGRESS`: "Pendiente", "En proceso de asignación", "Asignado", cada
   uno con nombre y color propios.
3. Confirmar que ya existía (o crear) el estado `FINAL` "Realizada".
4. Intentar guardar un conjunto sin ningún `FINAL` (quitar el tipo del único que hay) →
   **esperado**: error, no se guarda.
5. Intentar marcar un segundo estado como `FINAL` → **esperado**: error o el anterior se
   des-marca automáticamente (queda exactamente uno).
6. Ir al sector "Compras" (que no adaptó su conjunto) → **esperado**: sigue mostrando el
   conjunto general de la organización, no el de Metalúrgica.

## Escenario 3 — Asignar y visualizar estado (US2)

1. Crear una tarea nueva en el sector "Metalúrgica" → **esperado**: queda en el primer estado
   `IN_PROGRESS` del conjunto de ese sector ("Pendiente").
2. Cambiarla a "En proceso de asignación" → **esperado**: cambia de color/nombre en la lista,
   en el detalle y en el dashboard del sector, sin recargar la página.
3. Marcarla como "Realizada" (el `FINAL`) → **esperado**: aparece tachada, con quién/cuándo se
   completó; deja de contar como pendiente en los conteos del sector/dashboard.
4. Volver a "Pendiente" → **esperado**: deja de estar tachada, vuelve a contar como pendiente.

## Escenario 4 — Vista de tablero (US3)

1. En el mismo sector/proyecto, cambiar de vista lista a vista tablero.
2. **Esperado**: una columna por cada estado del conjunto aplicable, en el orden configurado,
   con las tareas correspondientes.
3. Mover una tarea a otra columna (vía el selector de la tarjeta) → **esperado**: mismo efecto
   que cambiarla desde la lista (persiste, se refleja en ambas vistas al alternar).

## Escenario 5 — Compatibilidad con integraciones existentes (FR-017)

1. Vía MCP (`task_setState` o `search_query` filtrando por completado), verificar que una tarea
   en cualquier estado `IN_PROGRESS` cuenta como "no completada" y una en `FINAL` cuenta como
   "completada".
2. Clonar un proyecto-plantilla (`cloneFromTemplate`) → **esperado**: solo se clonan las tareas
   en estado `IN_PROGRESS` (antes: `PENDING`), igual que hoy.
3. Exportar/archivar un trabajo → **esperado**: el checklist archivado marca `[x]` solo las
   tareas en estado `FINAL`.

## Criterio de aceptación global

Los 6 escenarios pasan sin intervención manual en la base de datos, y `npm run test` (Vitest)
pasa incluyendo los tests nuevos de `src/lib/domain/tasks/statusResolution.ts` y
`src/lib/domain/taskStatus/validate.ts`.
