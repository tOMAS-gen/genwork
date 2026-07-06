import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

const select = { id: true, title: true, content: true, createdAt: true, updatedAt: true } as const;

/** Nota del usuario autenticado; 404 si no existe o no le pertenece (no filtra existencia). */
async function getOwnNote(userId: string, id: string) {
  const note = await prisma.note.findFirst({ where: { id, userId }, select });
  if (!note) throw notFound();
  return note;
}

/** Nota individual (US1): solo accesible por su dueño. */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const note = await getOwnNote(session.user.id, id);
  return NextResponse.json(note);
});

const patchSchema = z
  .object({
    title: z.string(),
    content: z.any(),
  })
  .partial()
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nada para actualizar",
  });

/** Autoguardado (US1): actualiza solo los campos enviados. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  await getOwnNote(session.user.id, id);

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
    },
    select,
  });

  return NextResponse.json(updated);
});

/** Elimina la nota del usuario autenticado. */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  await getOwnNote(session.user.id, id);

  await prisma.note.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
