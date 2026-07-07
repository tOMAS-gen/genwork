import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { emit } from "@/server/events";

/**
 * Subida de archivos al visor del proyecto (feature 034, T011). Sube uno o
 * varios archivos a la carpeta actual del visor (`path`, subcarpeta navegada) o
 * a la raíz de la carpeta del proyecto. Funciona con el proveedor activo
 * (Google Drive o Nextcloud).
 */
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
      "La carpeta del proyecto todavía no está lista; reintentá en unos segundos",
    );
  }

  const storage = await getStorageProvider();
  if (!storage) {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
      { status: 404 },
    );
  }

  const form = await req.formData();
  const path = (form.get("path") as string | null) || work.nextcloudFolderPath;
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) throw conflict("Falta el archivo (campo 'file')");

  const uploaded: { name: string; path: string; size: number }[] = [];
  for (const file of files) {
    const { filePath } = await storage.upload({
      folderPath: path,
      fileName: file.name,
      data: Buffer.from(await file.arrayBuffer()),
    });
    uploaded.push({ name: file.name, path: filePath, size: file.size });
  }

  emit({ type: "work-changed", workId: id });
  return NextResponse.json({ uploaded }, { status: 201 });
});
