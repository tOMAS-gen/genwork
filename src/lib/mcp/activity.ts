import { prisma } from "@/lib/db/client";

export interface McpActivityEntry {
  connectionId: string;
  userId: string;
  toolName: string;
  targetType: string;
  targetId?: string;
  workId?: string;
  summary: string;
}

/**
 * Registra una acción MCP que mutó datos, para que quede visible como actividad
 * en Genwork (FR-010). Nunca se llama desde herramientas de solo lectura.
 */
export async function logMcpActivity(entry: McpActivityEntry): Promise<void> {
  await prisma.mcpActivityLog.create({
    data: {
      connectionId: entry.connectionId,
      userId: entry.userId,
      toolName: entry.toolName,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      workId: entry.workId ?? null,
      summary: entry.summary,
    },
  });
}
