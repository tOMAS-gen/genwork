# Contrato: API web de conexiones MCP (`/api/me/mcp-connections`)

Endpoints REST normales de Genwork (misma auth por cookie de sesión que el resto de
`/api/*`), usados por la pantalla "Asistentes conectados" para cumplir FR-009a/b. Siguen la
misma convención de errores que el resto de la API (`src/server/api.ts`).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/me/mcp-connections` | Lista las conexiones del usuario autenticado: `id`, `label`, `createdAt`, `lastUsedAt`, `revokedAt`. Nunca devuelve el token real (ya no se conoce tras la creación). |
| `POST` | `/api/me/mcp-connections` | Body `{ label }`. Genera un token nuevo (aleatorio, alta entropía), guarda su hash como `McpConnection`, y devuelve `{ id, label, token }` — **única vez** que el token en texto plano viaja al cliente. La UI lo muestra una sola vez con instrucciones de copiarlo a la configuración del asistente de IA. |
| `DELETE` | `/api/me/mcp-connections/[id]` | Revoca la conexión (`revokedAt = now()`). Efecto inmediato: cualquier request MCP posterior con ese token es rechazado (SC-006). Devuelve 404 si la conexión no es del usuario autenticado. |

## Reglas

- Un usuario solo puede listar/revocar sus propias conexiones (no hay vista de administrador
  para revocar conexiones de otros usuarios en esta versión — fuera de alcance, ver
  `spec.md` → Assumptions).
- El token generado en `POST` DEBE tener suficiente entropía para no ser adivinable
  (equivalente a un secreto de sesión, no a un código corto tipo OTP).
- No hay límite de cantidad de conexiones por usuario en esta versión.
