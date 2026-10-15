import { NextResponse } from "next/server";
import { z } from "zod";
import { searchGenstockProducts } from "@/server/genstock";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";

const querySchema = z.object({
  q: z.string().trim().optional().default(""),
});

export const GET = withApi(async (req) => {
  await requireInternal();
  const url = new URL(req.url);
  const { q } = querySchema.parse({ q: url.searchParams.get("q") ?? "" });
  const results = await searchGenstockProducts({ query: q, limit: 12 });
  return NextResponse.json(results);
});
