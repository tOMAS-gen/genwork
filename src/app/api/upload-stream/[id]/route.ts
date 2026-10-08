import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { badRequest, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { emit } from "@/server/events";
import { resolveUploadTarget, uploadFileName } from "@/server/workUpload";

/**
 * Subida en streaming de un archivo al visor del proyecto, para proveedores
 * sin subida directa desde el navegador (Nextcloud). El cuerpo es el archivo
 * crudo (`?name=` y `?path=` en la URL) y se reenvía al proveedor a medida que
 * llega, sin cargarlo entero en memoria.
 *
 * Vive fuera de `/api/works` porque `proxy.ts` no la intercepta: el proxy
 * guarda en memoria hasta 10 MB del cuerpo y trunca el resto. La autorización
 * la hacen los guards de acá (`requireWriter` deja afuera a CLIENT).
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const url = new URL(req.url);
  const fileName = uploadFileName(url.searchParams.get("name"));
  if (!req.body) throw badRequest("Falta el contenido del archivo");

  const { storage, folderPath } = await resolveUploadTarget(session.user.id, id, url.searchParams.get("path"));
  const { filePath } = await storage.upload({
    folderPath,
    fileName,
    data: Readable.fromWeb(req.body as NodeWebReadableStream),
  });

  emit({ type: "work-changed", workId: id });
  return NextResponse.json({ name: fileName, path: filePath }, { status: 201 });
});
