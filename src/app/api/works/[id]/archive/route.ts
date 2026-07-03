import { NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { buildArchivePackage } from "@/lib/domain/archive/builder";
import type { ArchivableTask } from "@/lib/domain/archive/render";
import type { Prisma } from "@prisma/client";

const ARCHIVE_DIR = process.env.ARCHIVE_DIR ?? "./storage/archives";

async function requireOperate(userId: string, workId: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();
  const ctx = await getUserContext(userId);
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();
  return work;
}

/** POST: inicia el armado del paquete (BUILDING → READY | FAILED). */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const work = await requireOperate(session.user.id, id);
  if (work.status === "ARCHIVED") throw conflict("El proyecto ya está archivado");

  const existing = await prisma.archiveRecord.findUnique({ where: { workId: id } });
  if (existing?.status === "BUILDING") {
    return NextResponse.json({ archiveId: id }, { status: 202 });
  }

  await prisma.archiveRecord.upsert({
    where: { workId: id },
    create: { workId: id, status: "BUILDING", archivedById: session.user.id },
    update: { status: "BUILDING", error: null, archivedById: session.user.id },
  });

  // Armado en background; el cliente hace polling del estado
  void (async () => {
    try {
      const full = await prisma.work.findUniqueOrThrow({
        where: { id },
        include: {
          doc: true,
          tasks: {
            include: {
              creator: { select: { name: true } },
              completedBy: { select: { name: true } },
              links: { include: { sector: true, user: { select: { name: true } } } },
            },
          },
        },
      });

      const tasks: ArchivableTask[] = full.tasks.map((t) => ({
        displayText: t.displayText,
        rawText: t.rawText,
        state: t.state,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        creatorName: t.creator.name,
        completedByName: t.completedBy?.name ?? null,
        tags: t.links.map((l) => ({
          symbol: l.type === "EXEC" ? "#" : l.targetType === "USER" ? "@" : "@",
          name: l.sector?.name ?? l.user?.name ?? "?",
        })),
      }));

      const storage = await getStorageProvider();
      const zipPath = path.join(ARCHIVE_DIR, `${id}.zip`);
      const manifest = await buildArchivePackage(
        storage,
        {
          workName: full.name,
          folderPath: full.nextcloudFolderPath,
          docContent: full.doc?.content ?? null,
          tasks,
        },
        zipPath,
      );

      await prisma.archiveRecord.update({
        where: { workId: id },
        data: {
          status: "READY",
          packagePath: zipPath,
          manifest: manifest as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // FR-031: falla → el trabajo permanece intacto
      await prisma.archiveRecord.update({
        where: { workId: id },
        data: { status: "FAILED", error: (err as Error).message },
      });
    }
  })();

  return NextResponse.json({ archiveId: id }, { status: 202 });
});

/** GET: estado del armado. */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await requireOperate(session.user.id, id);
  const record = await prisma.archiveRecord.findUnique({ where: { workId: id } });
  if (!record) throw notFound("Sin archivado iniciado");
  return NextResponse.json({ status: record.status, error: record.error });
});
