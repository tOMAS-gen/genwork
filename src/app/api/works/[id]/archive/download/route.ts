import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";

/** Descarga del ZIP (disponible con status READY o CONFIRMED). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const record = await prisma.archiveRecord.findUnique({
    where: { workId: id },
    include: { work: true },
  });
  if (!record) throw notFound();
  if (!record.packagePath || (record.status !== "READY" && record.status !== "CONFIRMED")) {
    throw conflict("El paquete todavía no está listo");
  }
  // el guard de sesión alcanza: quien puede pedir el archivado puede bajarlo
  void session;

  const stream = createReadStream(record.packagePath);
  const name = `${record.work.name.replace(/[^\p{L}\p{N} _-]/gu, "-")}.zip`;
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
    },
  });
});
