# Quickstart: Sistema de Registro de Errores

Guía de validación manual end-to-end. No sustituye a los tests unitarios de `src/lib/errors/` (ver `research.md` §6).

## Prerrequisitos

- Servidor corriendo en modo dev: `npm run dev` (puerto 3010).
- Migración de Prisma aplicada: `npm run db:migrate:dev` (crea la tabla `ErrorLog`).
- Una cuenta con `globalRole = SUPERADMIN` para acceder al panel admin.
- Una cuenta `MEMBER` (o sesión sin rol admin) para probar el rechazo de acceso.

## Escenario 1 — Captura automática (User Story 1, FR-001/002/003/010)

1. Provocar un error real y controlado en una ruta API existente (ej. pegarle a un endpoint con un payload que rompa una validación *después* del `parse` de Zod, o forzar temporalmente un `throw new Error("test-error")` en un handler cualquiera de `src/app/api/**/route.ts`).
2. Verificar que la respuesta HTTP al cliente sigue siendo la 500 estándar (`{"error":{"code":"INTERNAL",...}}`) — la operación original no se ve afectada (FR-010).
3. Consultar la tabla `ErrorLog` (`npx prisma studio` o `SELECT * FROM "ErrorLog"`) y verificar que apareció un registro nuevo con `message`, `stack`, `route`, `occurrences=1`, `status=PENDING`.
4. Repetir el mismo error 2 veces más y verificar que `occurrences` sube a 3 y NO se crean filas nuevas (FR-007).

**Resultado esperado**: 1 fila en `ErrorLog`, `occurrences=3`.

## Escenario 2 — Listado admin-only (User Story 2, FR-004/007/008)

1. Iniciar sesión con la cuenta `MEMBER` y navegar a `/admin/errors` (o llamar `GET /api/admin/errors`) → debe responder `403 FORBIDDEN` o redirigir (según sea API o página).
2. Iniciar sesión con la cuenta `SUPERADMIN` y abrir `/admin/errors`.
3. Verificar que el error del Escenario 1 aparece una sola vez, con `occurrences=3` visible, ordenado por más reciente primero.

**Resultado esperado**: acceso denegado para `MEMBER`; listado correcto y sin duplicados para `SUPERADMIN`.

## Escenario 3 — Detalle y resolución (User Story 3, FR-005/006/011)

1. Desde el listado (`SUPERADMIN`), abrir el detalle del error del Escenario 1.
2. Verificar que se ve `stack` completo, `route`, `context` (si el handler de prueba lo seteó) y que NO hay ningún campo con el body/payload crudo de la request (FR-002/FR-009 — verificación de seguridad).
3. Marcar el error como "Resuelto" → verificar que pasa a `status=RESOLVED` en el listado y ya no cuenta como pendiente.
4. Volver a disparar el mismo error (mismo `message`+`route`).
5. Verificar que el MISMO registro (mismo `id`) vuelve a `status=PENDING`, con `resolvedAt=null` y `occurrences` incrementado — no se crea un registro nuevo (FR-011, clarificado en sesión 2026-07-09).

**Resultado esperado**: el ciclo resolver → reaparecer → pendiente funciona sobre un único registro.

## Escenario 4 — Usuario no autenticado (edge case)

1. Disparar un error real desde una request sin sesión (endpoint público, si existe, o quitando la cookie de sesión).
2. Verificar que igual se crea/actualiza el `ErrorLog`, con `userId=null`.

## Escenario 5 — Falla del propio logging (edge case, FR-010)

1. Simular una falla en `logError` (ej. cortar temporalmente la conexión a la base o forzar un error dentro de `logError`).
2. Provocar un error de negocio en paralelo.
3. Verificar que el cliente sigue recibiendo la respuesta 500 normal (no un 500 distinto ni un timeout) — el fallo de logging no debe filtrarse a la respuesta HTTP.
