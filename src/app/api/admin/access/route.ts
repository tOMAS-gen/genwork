import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

/** GET/PUT configuración de acceso (FR-019). Solo SUPERADMIN. */

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json({
    mode: config?.mode ?? "LIST",
    domain: config?.domain ?? null,
  });
});

const putSchema = z.object({
  mode: z.enum(["DOMAIN", "LIST"]),
  domain: z
    .string()
    .trim()
    .regex(/^@?[a-z0-9.-]+\.[a-z]{2,}$/i, "Dominio inválido")
    .nullable()
    .optional(),
});

export const PUT = withApi(async (req) => {
  await requireSuperAdmin();
  const body = putSchema.parse(await req.json());
  const config = await prisma.accessConfig.upsert({
    where: { id: 1 },
    create: { id: 1, mode: body.mode, domain: body.domain ?? null },
    update: { mode: body.mode, domain: body.domain ?? null },
  });
  return NextResponse.json({ mode: config.mode, domain: config.domain });
});
