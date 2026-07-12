# Research: Servidor MCP con acceso completo a Genwork

## 1. Transporte y hosting del servidor MCP

**Decision**: Implementar el servidor MCP como un único Route Handler Next.js
(`src/app/api/mcp/route.ts`) usando `@modelcontextprotocol/sdk`, con el transporte
**Streamable HTTP** en modo *stateless* (`sessionIdGenerator: undefined`): se crea una
instancia nueva de `McpServer` + `StreamableHTTPServerTransport` por request, se conecta,
se procesa el único mensaje JSON-RPC entrante y se cierra. No se mantiene sesión MCP viva
entre requests (la "sesión" real es el token Bearer, resuelto en cada llamada).

**Rationale**: Genwork corre como app Next.js en Docker, potencialmente con réplicas o en un
entorno serverless-like; un transporte con estado en memoria de proceso (SSE de larga
duración o sesiones in-memory) no sobrevive a un restart ni se comparte entre réplicas. El
modo stateless de Streamable HTTP es el patrón documentado por el SDK para exactamente este
caso (framework HTTP tradicional sin proceso long-lived dedicado) y evita depender de sticky
sessions o de un almacén de sesión adicional. Cumple igual el protocolo MCP: los clientes
(asistentes de IA) hacen `POST /api/mcp` por cada llamada a herramienta.

**Alternatives considered**:
- *stdio transport*: descartado, requiere un proceso separado por cliente; no aplica a un
  backend web compartido por varios usuarios.
- *SSE / Streamable HTTP con estado (sesión persistida)*: descartado por ahora — agrega un
  store de sesión (Redis u otro) solo para sostener una conexión, sin necesidad funcional
  real (las herramientas de Genwork son todas de request/response corto, no hay streaming
  de progreso largo). Puede reconsiderarse si en el futuro se necesitan herramientas de
  larga duración con notificaciones de progreso.

## 2. Identidad del asistente y vinculación (FR-009, FR-009a, FR-009b)

**Decision**: Nueva tabla `McpConnection` con un token opaco de un solo uso al generarlo
(se muestra una única vez al usuario, igual que un Personal Access Token de GitHub); en DB
se guarda solo su hash (`sha256`). El endpoint `/api/mcp` valida
`Authorization: Bearer <token>`, hashea el token recibido, busca una `McpConnection` activa
(`revokedAt IS NULL`) y resuelve el `userId` asociado. A partir de ahí se arma el mismo
`UserContext` que usan los route handlers REST (`getUserContext(userId)`), así que toda
herramienta MCP queda sujeta exactamente a las mismas reglas de `src/lib/domain/permissions`.

**Rationale**: El login de Google de `next-auth` (`src/server/auth.ts`) requiere un flujo
interactivo de navegador que un asistente de IA no puede completar, y una cookie de sesión
no es algo que un cliente MCP pueda sostener ni revocar de forma independiente. Un token
personal generado desde la propia UI de Genwork (pantalla "Asistentes conectados") es el
patrón estándar en integraciones de este tipo (MCP, CLIs, webhooks) y resuelve directamente
FR-009a (vinculación explícita) y FR-009b (revocación inmediata: `revokedAt` se chequea en
cada request, sin cache).

**Alternatives considered**:
- *OAuth 2.0 completo (Authorization Code + PKCE) contra Genwork como authorization server*:
  es el mecanismo "más correcto" según la especificación MCP más reciente, pero implica
  construir un authorization server completo (endpoints `/authorize`, `/token`, gestión de
  client_id por asistente, etc.) — complejidad no justificada para un producto de un solo
  desarrollador con pocos usuarios (Principio V). Se documenta como ampliación futura si
  Genwork necesita algún día soportar múltiples asistentes de terceros con registro dinámico.
- *Reusar la sesión de next-auth compartiendo la cookie*: descartado, ver Complexity Tracking
  en `plan.md`.

## 3. Confirmación de dos pasos para acciones destructivas (FR-012)

**Decision**: Nueva tabla `McpConfirmation` (`id`, `connectionId`, `kind`, `payload` JSON,
`summary`, `expiresAt`, `consumedAt`). Toda herramienta marcada como destructiva sigue este
flujo:
1. Primera invocación (sin `confirmationToken`): valida permisos y datos, guarda un
   `McpConfirmation` con TTL corto (5 minutos) y devuelve `{status: "confirmation_required",
   confirmationToken, summary, expiresAt}` — **no** ejecuta el cambio.
2. Segunda invocación de la misma herramienta con `confirmationToken`: valida que el
   `McpConfirmation` exista, no haya expirado, no haya sido consumido ya, y pertenezca a la
   misma `McpConnection`; si todo es válido, ejecuta el cambio real y marca `consumedAt`.

**Rationale**: Persistir el pedido pendiente en DB (no en memoria) es necesario porque el
Route Handler es stateless entre requests (ver punto 1); dos invocaciones de la misma
herramienta pueden caer en instancias de proceso distintas. El TTL corto evita que un token
de confirmación quede "vivo" indefinidamente. Atar la confirmación a la misma `McpConnection`
evita que un token de confirmación filtrado sirva para otro usuario/asistente.

**Alternatives considered**:
- *Confirmación delegada al asistente de IA (solo prompt en lenguaje natural)*: es la opción
  B que el usuario rechazó explícitamente en `/speckit-clarify` — no da ninguna garantía a
  nivel de sistema.
- *Confirmación fuera de banda (email/push) antes de ejecutar*: demasiado lento y disruptivo
  para el flujo conversacional; no lo pide el spec y no hay canal de notificación push hoy.

## 4. Auditoría visible al usuario (FR-010)

**Decision**: Nueva tabla `McpActivityLog` (`id`, `connectionId`, `userId`, `toolName`,
`targetType`, `targetId`, `workId` nullable, `summary`, `createdAt`). Se inserta un registro
por cada herramienta MCP que efectivamente muta datos (no en las de solo lectura). La UI de
un proyecto (`Work`) muestra estas entradas en una sección nueva de "Actividad reciente"
(Genwork no tiene hoy ningún feed de actividad existente al que sumarse) cuando `workId`
coincide; las acciones administrativas (sin `workId`) se listan en la pantalla de
"Asistentes conectados" del usuario.

**Rationale**: Genwork hoy no tiene ningún registro de actividad genérico (se comprobó que
no existe una tabla de auditoría/actividad en `prisma/schema.prisma`); crear una tabla
mínima y específica al MCP es más simple que retrofitear un sistema de auditoría genérico
para toda la app, que no fue pedido y excede el alcance de este feature (Principio V).

**Alternatives considered**:
- *Loggear solo a stdout/logs del servidor*: no cumple FR-010 ("visible para el usuario
  dentro de la interfaz web"), resuelto explícitamente en `/speckit-clarify`.

## 5. Reuso del parser de etiquetado inline (Principio II)

**Decision**: La herramienta MCP de crear/editar tarea acepta un campo `text` (equivalente al
`rawText` que ya usa la web) y lo procesa con `parseTags` de `src/lib/domain/tags/parser.ts`
— el mismo parser que usa el editor web — para resolver `/trabajo`, `#sector`, `@referencia`
y `$etiqueta`. No se agregan campos estructurados alternativos para estas cuatro relaciones;
solo se aceptan campos estructurados para lo que el texto no puede expresar (p. ej. fecha de
vencimiento).

**Rationale**: Si el MCP aceptara, por ejemplo, un `sectorId` estructurado en paralelo al
símbolo `#`, se crearía una segunda forma de clasificar tareas que puede divergir del parser
real de la web, violando el Principio II ("interfaz primaria") y arriesgando el Principio I
(una tarea, sin duplicar reglas de armado). Reusar el parser existente garantiza que una
tarea creada por el asistente de IA se comporte exactamente igual que una creada a mano.

## 6. Middleware y autenticación del endpoint `/api/mcp`

**Decision**: `src/middleware.ts` agrega `/api/mcp` a la lista de rutas públicas para el
gate de cookie (junto a `/login` y `/api/auth`), y la validación de identidad para ese
endpoint se hace **dentro** del propio Route Handler, vía `requireMcpConnection(req)`
(`src/server/mcp-auth.ts`), que exige y valida el header `Authorization: Bearer`.

**Rationale**: El middleware actual asume que toda ruta protegida usa cookie de sesión de
next-auth; el MCP usa un mecanismo de auth distinto (Bearer token) por diseño (ver punto 2),
así que necesita su propio gate, igual de estricto pero con otra fuente de verdad.

**Alternatives considered**:
- *Extender el middleware para inspeccionar también el header Authorization*: posible, pero
  mezclar dos mecanismos de auth en un único middleware genérico es más difícil de leer y
  testear que dejar la validación específica del MCP en su propio handler, que ya centraliza
  toda la lógica de "quién es el usuario detrás de este request MCP".

## 7. Alcance de pruebas automatizadas

**Decision**: Igual que el resto de Genwork hoy (no hay harness de integración contra DB
real — ver memoria de proyecto sobre la feature de recordatorios), las pruebas de este
feature se limitan a las partes puras y testeables sin base de datos: generación/validación/
expiración de `McpConfirmation` (lógica de fechas y estado, con datos en memoria), mapeo de
errores de permisos a errores MCP, y que el texto con etiquetas inline llega intacto al
parser existente. La verificación end-to-end contra la base de datos real se hace manualmente
siguiendo `quickstart.md`, tal como ya se hace para el resto de features de Genwork.

**Rationale**: Introducir un harness de integración de DB para este feature específico
excede su alcance y contradice el Principio V; si el proyecto decide adoptarlo en general,
debería ser una iniciativa aparte que beneficie a todas las features, no solo al MCP.
