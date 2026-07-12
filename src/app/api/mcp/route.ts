import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireMcpConnection, McpAuthError } from "@/server/mcp-auth";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Endpoint único del servidor MCP (POST, Streamable HTTP en modo stateless —
 * ver research.md §1). Autenticado por `Authorization: Bearer <token>`, no por
 * cookie de sesión (excluido del middleware, ver src/middleware.ts).
 */
export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireMcpConnection(req);
  } catch (err) {
    if (err instanceof McpAuthError) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: err.message } },
        { status: 401 },
      );
    }
    throw err;
  }

  const server = createMcpServer(auth);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}
