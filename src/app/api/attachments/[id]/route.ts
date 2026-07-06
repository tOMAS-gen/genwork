import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { Readable } from "node:stream";

/** Proxy de lectura de archivos desde la mini nube. */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { work: { include: { group: { select: { publicRead: true } } } } },
  });
  if (!attachment) throw notFound();

  const ctx = await getUserContext(session.user.id);
  const level = access(ctx, {
    groupId: attachment.work.groupId,
    ownerId: attachment.work.ownerId,
    groupPublicRead: attachment.work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();

  const storage = await getStorageProvider();
  if (!storage) {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
      { status: 404 },
    );
  }
  const stream = await storage.read(attachment.nextcloudPath);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
    },
  });
});
