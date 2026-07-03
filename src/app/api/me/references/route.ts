import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** Apartado personal "Mis referencias": tareas que me mencionan con @ (FR-041/042). */
export const GET = withApi(async (req) => {
  const session = await requireSession();
  const state = new URL(req.url).searchParams.get("state");

  const links = await prisma.taskLink.findMany({
    where: {
      type: "REF",
      targetType: "USER",
      userId: session.user.id,
      task: {
        ...(state === "PENDING" || state === "DONE" ? { state } : {}),
        OR: [{ work: { status: "ACTIVE" } }, { workId: null }],
      },
    },
    include: {
      task: {
        include: {
          links: { include: { sector: true, user: { select: { id: true, name: true } } } },
          work: { select: { id: true, name: true } },
          homeSector: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(links.map((l) => l.task));
});
