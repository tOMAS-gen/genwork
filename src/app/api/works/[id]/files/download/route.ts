import { NextResponse } from "next/server";
import { badRequest, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getStorageProvider } from "@/lib/storage";
import { assertWorkAccess, confineWorkPath } from "@/lib/storage/access-check";
import { StorageIdentityMissingError } from "@/lib/storage/identity";
import { Readable } from "node:stream";

/** Descarga un archivo puntual de la carpeta del trabajo (FR-002, FR-005, FR-007). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const { work } = await assertWorkAccess(session.user.id, id, "read");

  if (!work.nextcloudFolderPath) {
    throw notFound("Sin carpeta de archivos configurada");
  }

  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path");
  if (!relPath) throw badRequest("Falta el parámetro path");

  const fullPath = confineWorkPath(work.nextcloudFolderPath, relPath);

  let storage;
  try {
    storage = await getStorageProvider(session.user.id);
  } catch (err) {
    if (err instanceof StorageIdentityMissingError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 424 },
      );
    }
    console.error("Storage provider error:", err);
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "El almacenamiento no está configurado" } },
      { status: 503 },
    );
  }

  if (!storage) {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
      { status: 503 },
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
