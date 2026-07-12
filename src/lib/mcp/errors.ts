import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "@/server/api";
import { McpAuthError } from "@/server/mcp-auth";
import { ConfirmationError } from "@/lib/mcp/confirmation";
import type { PendingConfirmation } from "@/lib/mcp/confirmation";

/** Resultado exitoso de una herramienta MCP: texto legible + datos estructurados. */
export function toolSuccess(
  text: string,
  structuredContent?: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: "text", text }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

/** Primera invocación de una herramienta destructiva (FR-012): no ejecuta nada. */
export function toolConfirmationRequired(pending: PendingConfirmation): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${pending.summary} — para confirmar, volvé a invocar esta herramienta con confirmationToken="${pending.confirmationToken}" antes de ${pending.expiresAt}.`,
      },
    ],
    structuredContent: {
      status: "confirmation_required",
      confirmationToken: pending.confirmationToken,
      summary: pending.summary,
      expiresAt: pending.expiresAt,
    },
  };
}

/**
 * Mapea cualquier error de una herramienta MCP a un `CallToolResult` con
 * `isError: true` — así el asistente ve el error y puede corregirse, en vez de
 * un error de protocolo opaco.
 */
export function toToolErrorResult(err: unknown): CallToolResult {
  if (err instanceof ApiError) {
    return errorResult(err.message);
  }
  if (err instanceof McpAuthError) {
    return errorResult(err.message);
  }
  if (err instanceof ConfirmationError) {
    return errorResult(err.message);
  }
  if (err instanceof ZodError) {
    return errorResult(err.issues[0]?.message ?? "Datos inválidos");
  }
  console.error("MCP tool error:", err);
  return errorResult("Error interno");
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
