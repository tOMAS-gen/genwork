import { NextResponse } from "next/server";
import { getGenstockContext } from "@/server/genstock";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";

export const GET = withApi(async () => {
  await requireInternal();
  const context = await getGenstockContext();
  return NextResponse.json(context);
});
