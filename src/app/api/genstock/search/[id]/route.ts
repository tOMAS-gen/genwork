import { NextResponse } from "next/server";
import { getGenstockItem } from "@/server/genstock";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireInternal();
  const { id } = await params;
  const item = await getGenstockItem(id);
  return NextResponse.json(item);
});
