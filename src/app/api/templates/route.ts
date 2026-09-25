import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { listTemplates } from "@/server/objectives";

/**
 * objetivos: plantillas insertables como objetivo (diálogo "Desde plantilla"),
 * con `copyableTaskCount` = las tareas que se copiarían (crítica I9). Mismo
 * filtro que `GET /api/works?filter=templates`, pero con el DTO liviano de
 * `listTemplates` (el dashboard sigue con el suyo, crítica "Menor").
 * `?groupId=` acota a las de ese grupo.
 */
export const GET = withApi(async (req) => {
  const session = await requireInternal();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);
  const groupId = z.string().uuid().optional().parse(url.searchParams.get("groupId") ?? undefined);
  return NextResponse.json(await listTemplates(ctx, { groupId }));
});
