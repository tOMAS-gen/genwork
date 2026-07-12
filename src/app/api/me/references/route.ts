import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** Apartado personal "Mis referencias": tareas que me mencionan con @ (FR-041/042). */
export const GET = withApi(async (req) => {
  const session = await requireSession();
  const url = new URL(req.url);
  const statusId = url.searchParams.get("statusId");
  const type = url.searchParams.get("type");

  const links = await prisma.taskLink.findMany({
    where: {
      type: "REF",
      targetType: "USER",
      userId: session.user.id,
      task: {
        ...(statusId ? { statusId } : {}),
        ...(type === "IN_PROGRESS" || type === "FINAL" ? { status: { type } } : {}),
        OR: [{ work: { status: "ACTIVE" } }, { workId: null }],
      },
    },
    include: {
      task: {
        include: {
          links: { include: { sector: true, user: { select: { id: true, name: true } } } },
          work: { select: { id: true, name: true } },
          homeSector: { select: { id: true, name: true } },
          status: true,
        },
      },
    },
  });

  return NextResponse.json(links.map((l) => l.task));
});
