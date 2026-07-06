import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";

/** DELETE /api/favorites/{workId} — desmarca un proyecto como favorito (FR-718/719). */
export const DELETE = withApi<{ params: Promise<{ workId: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { workId } = await params;

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_workId: { userId: session.user.id, workId } },
  });
  if (!existing) throw notFound("Ese proyecto no era favorito");

  await prisma.userFavorite.delete({
    where: { userId_workId: { userId: session.user.id, workId } },
  });

  return new NextResponse(null, { status: 200 });
});
