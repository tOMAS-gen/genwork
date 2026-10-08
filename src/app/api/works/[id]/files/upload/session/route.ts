import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { resolveUploadTarget, uploadFileName } from "@/server/workUpload";

const Body = z.object({
  path: z.string().nullish(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  mimeType: z.string().max(255).nullish(),
});

/**
 * Prepara la subida de un archivo al visor del proyecto. Si el proveedor
 * activo permite subida directa (Google Drive), devuelve la URL a la que el
 * navegador sube el archivo sin pasar por genwork (`mode: "direct"`); si no
 * (Nextcloud), el cliente sube por `/api/upload-stream/{id}` (`mode: "proxy"`).
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const body = Body.parse(await req.json());
  const fileName = uploadFileName(body.name);

  const { storage, folderPath } = await resolveUploadTarget(session.user.id, id, body.path);
  if (!storage.createUploadSession) {
    return NextResponse.json({ mode: "proxy" });
  }

  const { uploadUrl } = await storage.createUploadSession({
    folderPath,
    fileName,
    size: body.size,
    mimeType: body.mimeType || undefined,
    origin: req.headers.get("origin") ?? undefined,
  });
  return NextResponse.json({ mode: "direct", uploadUrl });
});
