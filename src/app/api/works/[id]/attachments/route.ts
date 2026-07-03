import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { emit } from "@/server/events";

/** Subida de adjuntos a la carpeta del trabajo en la mini nube (FR-029). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();

  const ctx = await getUserContext(session.user.id);
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();

  if (!work.nextcloudFolderPath) {
    throw conflict(
      "La carpeta del proyecto todavía no está lista en la mini nube; reintentá en unos segundos",
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw conflict("Falta el archivo (campo 'file')");

  const storage = await getStorageProvider();
  const { filePath } = await storage.upload({
    folderPath: work.nextcloudFolderPath,
    fileName: file.name,
    data: Buffer.from(await file.arrayBuffer()),
  });

  const attachment = await prisma.attachment.create({
    data: {
      workId: id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      nextcloudPath: filePath,
      uploadedById: session.user.id,
    },
  });
  emit({ type: "work-changed", workId: id });
  return NextResponse.json(attachment, { status: 201 });
});
