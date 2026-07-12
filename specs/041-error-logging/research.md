# Research: Sistema de Registro de Errores

## 1. Punto de captura de errores no controlados

**Decision**: Extender `withApi()` (`src/server/api.ts`) — el wrapper que ya envuelve todos los route handlers de `src/app/api/**/route.ts` — para que, en la rama catch-all (`console.error("API error:", err)`, antes de responder 500), llame de forma *best-effort* a un nuevo helper `logError(err, context)` de `src/lib/errors/log.ts`.

**Rationale**: Es el único lugar por el que ya pasan, hoy, prácticamente todos los errores no controlados del servidor (todas las rutas API usan `withApi`). No hace falta instrumentar cada handler individualmente. Cumple FR-001 y FR-010 (best-effort: si `logError` falla, no debe re-lanzar ni afectar la respuesta 500 que ya se va a enviar).

**Alternatives considered**:
- *Middleware de Next.js (`src/middleware.ts`)*: rechazado — el middleware corre antes del handler y no tiene acceso al error lanzado dentro de él.
- *Instrumentar cada route handler individualmente*: rechazado — viola YAGNI/Principio V (simplicidad), duplica código en ~decenas de archivos.
- *`instrumentation.ts` con `onRequestError` de Next.js*: viable en teoría, pero agrega una capa de configuración adicional del framework para un beneficio marginal frente a extender `withApi`, que ya es el punto de paso único. Se descarta por simplicidad.

**Alcance de "acciones de servidor"**: se relevó el repo y solo hay 2 archivos con `"use server"` (`src/app/(main)/layout.tsx`, `src/app/login/page.tsx`), ambos ligados al flujo de autenticación (fuera del alcance útil para este feature: errores de login no deberían quedar atrapados por un sistema pensado para depurar bugs de negocio, y capturarlos añadiría ruido). Confirmado como fuera de alcance: la Assumption existente de la spec ("cubre errores del lado del servidor: APIs y acciones de servidor") se satisface en la práctica capturando `withApi`, que es donde vive el 100% de las mutaciones/consultas de negocio.

## 2. Modelo de datos y agrupamiento (fingerprint)

**Decision**: Un modelo Prisma `ErrorLog` con una columna `fingerprint` (hash determinístico de `message + route`) marcada `@unique`. Al capturar un error se hace un único `prisma.errorLog.upsert()`: la rama `create` arma un registro nuevo (`status=PENDING`, `occurrences=1`); la rama `update` es **incondicional** — siempre fija `occurrences: {increment:1}`, `lastSeenAt=now()`, `status="PENDING"`, `resolvedAt=null` — sin leer el estado previo. Esto es válido porque el mismo efecto sirve para los dos casos de FR-011: si el registro ya estaba `PENDING`, fijar `PENDING` de nuevo es un no-op; si estaba `RESOLVED`, lo reabre.

**Rationale**: Resuelve FR-007 y FR-011 (aclarados en `/speckit-clarify`: mismo mensaje+ruta = mismo error; reabrir el mismo registro, no crear uno nuevo) con una sola operación atómica (`prisma.errorLog.upsert`, que Prisma compila a `INSERT ... ON CONFLICT DO UPDATE` en Postgres), evitando condiciones de carrera entre errores concurrentes del mismo tipo. Al ser el `update` incondicional, no hace falta un `findUnique` previo para decidir su contenido — leer antes de escribir es precisamente lo que rompería la atomicidad.

**Alternatives considered**:
- *Buscar por `message`+`route` con `findFirst` + `update`/`create` separado*: rechazado — dos escrituras no atómicas, riesgo de duplicados bajo concurrencia.
- *Hash incluyendo el stack trace completo*: rechazado — el stack trace puede variar levemente entre ocurrencias del mismo bug (líneas de librerías, async traces), lo que rompería el agrupamiento esperado por FR-007 (definido explícitamente como "mismo mensaje y misma ruta/acción").

## 3. Datos capturados (sin payload/body)

**Decision**: Persistir únicamente: `message`, `stack`, `route` (ruta/acción de origen), `method` (verbo HTTP), `userId` (nullable), `context` (JSON opcional y acotado: solo IDs de entidades relevantes ya conocidos por el handler — nunca el body crudo de la request), `status`, `occurrences`, `firstSeenAt`, `lastSeenAt`.

**Rationale**: Decisión explícita de `/speckit-clarify` (Q1): no capturar el payload/body de la solicitud en absoluto, para eliminar de raíz el riesgo de persistir contraseñas/tokens (FR-002, FR-009). El campo `context` es opcional y lo llena el propio código de negocio con datos ya validados (ej. `{ workId, taskId }`), nunca un volcado automático del `req.body`.

**Alternatives considered**: lista de redacción de campos sensibles (evaluada como Opción B en `/speckit-clarify`, no elegida) — se descartó porque exige mantener una lista de patrones de nombres sensibles y aun así puede tener falsos negativos; la opción elegida (no capturar body) es más simple y estrictamente más segura.

## 4. Autorización

**Decision**: Reusar `requireSuperAdmin()` de `src/server/guards.ts` en las nuevas rutas API (`GET /api/admin/errors`, `GET /api/admin/errors/[id]`, `PATCH /api/admin/errors/[id]`) y en la página `src/app/(main)/admin/errors/page.tsx` (mismo patrón `redirect("/")` que `src/app/(main)/admin/page.tsx`).

**Rationale**: Es exactamente el guard existente para "solo administrador del sistema" (FR-008); no se necesita ningún mecanismo nuevo. La captura de errores (escritura) no requiere auth — corre en el servidor para cualquier request, autenticado o no (edge case de la spec: usuario sin sesión).

**Alternatives considered**: nuevo rol o permiso dedicado — rechazado, sobre-ingeniería para un solo administrador real en este sistema (Principio V, YAGNI).

## 5. UI / listado y detalle

**Decision**: Nueva sección admin-only en `src/app/(main)/admin/errors/page.tsx` (server component con guard + fetch inicial) + tarjeta nueva en el grid de `src/app/(main)/admin/page.tsx`. El listado reutiliza el patrón cliente de `WorkActivityFeed.tsx` (fetch con `useApi`, lista con ícono + resumen + fecha `toLocaleString("es-AR")`) adaptado a filas clickeables que abren el detalle (modal o sub-ruta `/admin/errors/[id]`).

**Rationale**: Consistencia visual y de código con el resto del panel admin y con el feed de actividad MCP ya existente; no introduce una librería ni patrón nuevo de UI.

**Alternatives considered**: página externa/dashboard separado (ej. estilo Sentry) — rechazado, fuera de alcance y de la filosofía de simplicidad del proyecto.

## 6. Testing

**Decision**: Tests unitarios (Vitest, sin DB real) para la lógica pura: (a) función de generación de `fingerprint(message, route)`, (b) función que decide el nuevo `status`/`occurrences` dado un registro existente y una nueva ocurrencia (incluyendo el caso de reapertura FR-011), (c) función que arma el `context` a partir de datos ya provistos (nunca lee `req.body`). Siguiendo el patrón de `tests/unit/mcp-errors.test.ts`: sin mocks de Prisma, se testean funciones puras extraídas a `src/lib/errors/`.

**Rationale**: Coherente con el estilo de testing actual del repo (no hay helper de test-DB; los tests existentes ejercitan funciones puras). La integración con Prisma (`upsert`) se verifica manualmente vía `quickstart.md`, igual que el resto del admin panel.

## Resumen de decisiones (Technical Context)

| Aspecto | Decisión |
|---|---|
| Lenguaje | TypeScript 5.8 sobre Next.js 15 (App Router) |
| Storage | PostgreSQL vía Prisma 6 (mismo datasource existente) |
| Punto de captura | `withApi()` en `src/server/api.ts` (catch-all) |
| Autorización | `requireSuperAdmin()` existente |
| Testing | Vitest, funciones puras sin mocks de Prisma |
