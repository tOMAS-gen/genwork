import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpAuth } from "@/server/mcp-auth";
import { registerConnectionTools } from "@/lib/mcp/tools/connection";
import { registerWorkTools } from "@/lib/mcp/tools/works";
import { registerTaskTools } from "@/lib/mcp/tools/tasks";
import { registerDocTools } from "@/lib/mcp/tools/docs";
import { registerAttachmentTools } from "@/lib/mcp/tools/attachments";
import { registerSearchTools } from "@/lib/mcp/tools/search";
import { registerLabelTools } from "@/lib/mcp/tools/labels";
import { registerNoteTools } from "@/lib/mcp/tools/notes";
import { registerReminderTools } from "@/lib/mcp/tools/reminders";
import { registerFavoriteTools } from "@/lib/mcp/tools/favorites";
import { registerGroupTools } from "@/lib/mcp/tools/groups";
import { registerAdminTools } from "@/lib/mcp/tools/admin";
import { registerTaskStatusTools } from "@/lib/mcp/tools/taskStatus";

const SERVER_INFO = { name: "genwork", version: "1.0.0" };

/**
 * Crea una instancia nueva de `McpServer` por request (modo stateless, ver
 * research.md §1) con todas las herramientas registradas, cerradas sobre el
 * usuario/conexión ya autenticado en `ctx` — así cada herramienta actúa
 * siempre como ese usuario (FR-009), sin necesidad de pasar el contexto por
 * fuera del closure.
 */
export function createMcpServer(ctx: McpAuth): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerConnectionTools(server, ctx);
  registerWorkTools(server, ctx);
  registerTaskTools(server, ctx);
  registerDocTools(server, ctx);
  registerAttachmentTools(server, ctx);
  registerSearchTools(server, ctx);
  registerLabelTools(server, ctx);
  registerNoteTools(server, ctx);
  registerReminderTools(server, ctx);
  registerFavoriteTools(server, ctx);
  registerGroupTools(server, ctx);
  registerAdminTools(server, ctx);
  registerTaskStatusTools(server, ctx);
  return server;
}
