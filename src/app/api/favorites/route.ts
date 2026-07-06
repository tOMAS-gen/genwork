import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";

const createSchema = z.object({
  workId: z.string().uuid(),
});

/** POST /api/favorites — marca un proyecto como favorito del usuario activo (FR-718/719). */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { workId } = createSchema.parse(await req.json());

  const work = await prisma.work.findUnique({ where: { id: workId } });
  if (!work) throw notFound("El proyecto no existe");

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_workId: { userId: session.user.id, workId } },
  });
  if (existing) throw conflict("Ya marcaste este proyecto como favorito");

  const favorite = await prisma.userFavorite.create({
    data: { userId: session.user.id, workId },
  });
  return NextResponse.json(favorite, { status: 201 });
});
