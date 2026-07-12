import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { notFound } from "@/server/api";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

const select = { id: true, title: true, content: true, createdAt: true, updatedAt: true } as const;

async function getOwnNote(ctx: McpAuth, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId: ctx.userId }, select });
  if (!note) throw notFound("Nota no encontrada");
  return note;
}

/** Las notas siempre son personales (`Note.userId`); no tienen ámbito de grupo. */
export function registerNoteTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "note.list",
    {
      title: "Listar notas",
      description: "Lista las notas personales del usuario, más recientes primero.",
      inputSchema: {},
    },
    async () => {
      try {
        const notes = await prisma.note.findMany({
          where: { userId: ctx.userId },
          orderBy: { updatedAt: "desc" },
          select,
        });
        return toolSuccess(`${notes.length} nota(s).`, { notes });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "note.get",
    {
      title: "Obtener nota",
      description: "Devuelve una nota personal por id.",
      inputSchema: { noteId: z.string().uuid() },
    },
    async ({ noteId }) => {
      try {
        const note = await getOwnNote(ctx, noteId);
        return toolSuccess(note.title ? `Nota "${note.title}".` : "Nota sin título.", note);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "note.create",
    {
      title: "Crear nota",
      description: "Crea una nota personal nueva.",
      inputSchema: { title: z.string().trim().max(200).optional(), content: z.unknown().optional() },
    },
    async ({ title, content }) => {
      try {
        const note = await prisma.note.create({
          data: { userId: ctx.userId, title: title ?? "", content: (content as object) ?? undefined },
          select,
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "note.create",
          targetType: "Note",
          targetId: note.id,
          summary: `El asistente de IA creó una nota${note.title ? ` "${note.title}"` : ""}.`,
        });

        return toolSuccess("Nota creada.", note);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "note.update",
    {
      title: "Actualizar nota",
      description: "Actualiza el título y/o contenido de una nota personal.",
      inputSchema: {
        noteId: z.string().uuid(),
        title: z.string().trim().max(200).optional(),
        content: z.unknown().optional(),
      },
    },
    async ({ noteId, title, content }) => {
      try {
        await getOwnNote(ctx, noteId);
        const updated = await prisma.note.update({
          where: { id: noteId },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content: content as object } : {}),
          },
          select,
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "note.update",
          targetType: "Note",
          targetId: noteId,
          summary: "El asistente de IA actualizó una nota.",
        });

        return toolSuccess("Nota actualizada.", updated);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
