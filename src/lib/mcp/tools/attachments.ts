import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound } from "@/server/api";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { emit } from "@/server/events";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

async function getWorkAccess(ctx: McpAuth, workId: string, need: "read" | "operate") {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound("Proyecto no encontrado");
  const level = access(ctx.userContext, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound("Proyecto no encontrado");
  if (need === "operate" && level !== "operate") throw forbidden();
  return work;
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * `attachment.delete` no se implementa en esta versión: el `StorageProvider`
 * (Nextcloud/Google Drive) hoy solo borra la carpeta completa de un proyecto,
 * no un archivo individual — tampoco existe esa capacidad en la web (ver
 * spec.md → Assumptions).
 */
export function registerAttachmentTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "attachment.list",
    {
      title: "Listar adjuntos",
      description: "Lista los adjuntos de un proyecto.",
      inputSchema: { workId: z.string().uuid() },
    },
    async ({ workId }) => {
      try {
        await getWorkAccess(ctx, workId, "read");
        const attachments = await prisma.attachment.findMany({
          where: { workId },
          orderBy: { createdAt: "desc" },
        });
        return toolSuccess(`${attachments.length} adjunto(s).`, {
          attachments: attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            mimeType: a.mimeType,
            size: a.size,
            createdAt: a.createdAt,
          })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "attachment.upload",
    {
      title: "Subir adjunto",
      description: "Sube un archivo (en base64) a un proyecto, al mismo almacenamiento que usa la web.",
      inputSchema: {
        workId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().min(1).max(120),
        contentBase64: z.string().min(1),
      },
    },
    async ({ workId, fileName, mimeType, contentBase64 }) => {
      try {
        const work = await getWorkAccess(ctx, workId, "operate");
        if (!work.nextcloudFolderPath) {
          throw conflict("La carpeta del proyecto todavía no está lista; reintentá en unos segundos");
        }
        const storage = await getStorageProvider();
        if (!storage) throw conflict("Almacenamiento no configurado");

        const data = Buffer.from(contentBase64, "base64");
        const { filePath } = await storage.upload({
          folderPath: work.nextcloudFolderPath,
          fileName,
          data,
        });

        const attachment = await prisma.attachment.create({
          data: {
            workId,
            fileName,
            mimeType,
            size: data.byteLength,
            nextcloudPath: filePath,
            uploadedById: ctx.userId,
          },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "attachment.upload",
          targetType: "Attachment",
          targetId: attachment.id,
          workId,
          summary: `El asistente de IA subió el adjunto "${fileName}".`,
        });
        emit({ type: "work-changed", workId });

        return toolSuccess(`Adjunto "${fileName}" subido.`, {
          id: attachment.id,
          fileName: attachment.fileName,
          size: attachment.size,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "attachment.download",
    {
      title: "Descargar adjunto",
      description: "Devuelve el contenido (en base64) de un adjunto.",
      inputSchema: { attachmentId: z.string().uuid() },
    },
    async ({ attachmentId }) => {
      try {
        const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
        if (!attachment) throw notFound("Adjunto no encontrado");
        await getWorkAccess(ctx, attachment.workId, "read");

        const storage = await getStorageProvider();
        if (!storage) throw conflict("Almacenamiento no configurado");
        const stream = await storage.read(attachment.nextcloudPath);
        const buffer = await streamToBuffer(stream);

        return toolSuccess(`Adjunto "${attachment.fileName}" (${buffer.byteLength} bytes).`, {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          contentBase64: buffer.toString("base64"),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
