import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** Notas personales del usuario autenticado, más recientes primero. */
export const GET = withApi(async () => {
  const session = await requireSession();

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(notes);
});

/** Crea una nota vacía para el usuario autenticado. */
export const POST = withApi(async () => {
  const session = await requireSession();

  const note = await prisma.note.create({
    data: { title: "", content: undefined, userId: session.user.id },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(note, { status: 201 });
});
