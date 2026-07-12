import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { getUserContext } from "@/server/user-context";
import type { UserContext } from "@/lib/domain/permissions";

/** Resultado de autenticar un request MCP: quién es el usuario detrás del token. */
export interface McpAuth {
  connectionId: string;
  userId: string;
  userContext: UserContext;
}

export class McpAuthError extends Error {
  constructor(message = "Token MCP inválido, ausente o revocado") {
    super(message);
    this.name = "McpAuthError";
  }
}

/** `sha256` en hex — mismo hash que se guarda en `McpConnection.tokenHash`. */
export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Decisión pura: una conexión solo es válida si nunca fue revocada (SC-006). */
export function isConnectionActive(connection: { revokedAt: Date | null }): boolean {
  return connection.revokedAt === null;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Valida el `Authorization: Bearer <token>` de un request a `/api/mcp` y devuelve el
 * usuario en cuyo nombre actúa el asistente (FR-009). Lanza `McpAuthError` sin
 * excepciones si falta el token, no existe la conexión, o fue revocada (FR-009b).
 */
export async function requireMcpConnection(req: Request): Promise<McpAuth> {
  const token = extractBearerToken(req);
  if (!token) throw new McpAuthError();

  const connection = await prisma.mcpConnection.findUnique({
    where: { tokenHash: hashMcpToken(token) },
  });
  if (!connection || !isConnectionActive(connection)) {
    throw new McpAuthError();
  }

  // Best-effort: no bloquea el request si falla.
  void prisma.mcpConnection
    .update({ where: { id: connection.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  const userContext = await getUserContext(connection.userId);
  return { connectionId: connection.id, userId: connection.userId, userContext };
}
