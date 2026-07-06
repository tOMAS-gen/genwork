import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { badRequest, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { Readable } from "node:stream";

async function getWorkWithAccess(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  // Sin acceso: 404, no filtra existencia (contrato)
  if (level === "none") throw notFound();
  return { work, ctx };
}

/** Descarga un archivo puntual de la carpeta del trabajo (FR-037). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id);

  if (!work.nextcloudFolderPath) {
    throw notFound("Sin carpeta de archivos configurada");
  }

  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path");
  if (!relPath) throw badRequest("Falta el parámetro path");
  if (relPath.includes("..")) throw badRequest("Ruta inválida");

  const fullPath = `${work.nextcloudFolderPath}/${relPath}`;

  let storage;
  try {
    storage = await getStorageProvider();
  } catch (err) {
    console.error("Storage provider error:", err);
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "El almacenamiento no está configurado" } },
      { status: 500 },
    );
  }

  const stream = await storage.read(fullPath);
  const fileName = relPath.split("/").pop() || "archivo";

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/octet-stream",
    },
  });
});
