import { NextResponse } from "next/server";
import { z } from "zod";
import { searchGenstockProducts } from "@/server/genstock";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";

const querySchema = z.object({
  q: z.string().trim().optional().default(""),
  // "Solo insumos" viene activo por defecto; supply=0 busca en todo el catálogo.
  supply: z.enum(["0", "1"]).optional().default("1"),
});

export const GET = withApi(async (req) => {
  await requireInternal();
  const url = new URL(req.url);
  const { q, supply } = querySchema.parse({
    q: url.searchParams.get("q") ?? "",
    supply: url.searchParams.get("supply") ?? undefined,
  });

  if (supply === "0") {
    const results = await searchGenstockProducts({ query: q, limit: 12 });
    return NextResponse.json({ ...results, supplyFallback: false });
  }

  const supplies = await searchGenstockProducts({ query: q, limit: 12, supplyOnly: true });
  if (supplies.items.length > 0 || !q) {
    return NextResponse.json({ ...supplies, supplyFallback: false });
  }

  // Ningún insumo coincide: se busca en todo el catálogo para no dejar al
  // usuario sin resultados por un producto que no está marcado como insumo.
  const all = await searchGenstockProducts({ query: q, limit: 12 });
  return NextResponse.json({ ...all, supplyFallback: all.items.length > 0 });
});
