import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { deleteProjectFolder, renameProjectFolder } from "@/server/projectFolders";

const patchSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** PATCH /api/project-folders/{id} — renombra; mueve en la nube las carpetas de sus proyectos. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;
  const { name } = patchSchema.parse(await req.json());
  return NextResponse.json(await renameProjectFolder(ctx, id, name));
});

/** DELETE /api/project-folders/{id} — borra la carpeta; sus proyectos quedan sin carpeta. */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;
  await deleteProjectFolder(ctx, id);
  return new NextResponse(null, { status: 204 });
});
