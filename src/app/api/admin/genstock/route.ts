import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, withApi } from "@/server/api";
import { getGenstockConfig } from "@/server/genstock";
import { requireSuperAdmin } from "@/server/guards";

const putSchema = z.object({
  baseUrl: z.string().trim().max(2048).optional().default(""),
});

export const GET = withApi(async () => {
  await requireSuperAdmin();
  return NextResponse.json(await getGenstockConfig());
});

export const PUT = withApi(async (req) => {
  await requireSuperAdmin();
  const body = putSchema.parse(await req.json());
  const baseUrl = normalizeBaseUrl(body.baseUrl);

  await prisma.accessConfig.upsert({
    where: { id: 1 },
    create: { id: 1, genstockBaseUrl: baseUrl || null },
    update: { genstockBaseUrl: baseUrl || null },
  });

  return NextResponse.json(await getGenstockConfig());
});

export function normalizeBaseUrl(raw: string) {
  const value = raw.trim().replace(/\/+$/, "");
  if (!value) return "";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw badRequest("La URL de Genstock no es válida");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw badRequest("La URL de Genstock debe empezar con http:// o https://");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}
