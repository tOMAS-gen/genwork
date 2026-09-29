import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { createProjectFolder, listProjectFolders } from "@/server/projectFolders";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-folders — carpetas de proyectos visibles (feature 063).
 * ?groupId= solo las del grupo; ?personal=true solo las personales.
 */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);
  const groupId = z.string().uuid().optional().parse(url.searchParams.get("groupId") ?? undefined);
  const personal = url.searchParams.get("personal") === "true";
  return NextResponse.json(await listProjectFolders(ctx, { groupId, personal }));
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Sin grupo: carpeta personal del usuario. */
  groupId: z.string().uuid().nullable().optional(),
});

/** POST /api/project-folders — crea una carpeta en el ámbito (409 si el nombre ya existe). */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const input = createSchema.parse(await req.json());
  return NextResponse.json(await createProjectFolder(ctx, input), { status: 201 });
});
