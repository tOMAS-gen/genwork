import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/server/api";
import { requireClientWork } from "@/server/guards";
import { getPortalActivity } from "@/server/portal";

const querySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).default(50),
});

/** Historial de cambios de estado del proyecto (feature 059, US4). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  await requireClientWork(id);

  const url = new URL(req.url);
  const { cursor, take } = querySchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });

  return NextResponse.json(await getPortalActivity(id, { take, cursor }));
});
