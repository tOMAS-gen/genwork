import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";

/**
 * Confirmación del export (FR-031): recién acá el trabajo pasa a ARCHIVED y sale
 * de los activos y de las vistas de sector (FR-032 primer paso).
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
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

  const record = await prisma.archiveRecord.findUnique({ where: { workId: id } });
  if (record?.status !== "READY") {
    throw conflict("Primero descargá el paquete (el export debe estar listo)");
  }

  const [, updated] = await prisma.$transaction([
    prisma.archiveRecord.update({
      where: { workId: id },
      data: { status: "CONFIRMED", archivedAt: new Date() },
    }),
    prisma.work.update({ where: { id }, data: { status: "ARCHIVED" } }),
  ]);

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(updated);
});
