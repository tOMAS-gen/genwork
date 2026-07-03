import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { encryptSecret } from "@/lib/crypto";

/** Módulo de conexión del almacenamiento (FR-037). Solo SUPERADMIN. */

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const stored = config?.storageConfig as { url?: string; adminUser?: string } | null;
  return NextResponse.json({
    provider: config?.storageProvider ?? "NEXTCLOUD",
    url: stored?.url ?? process.env.NEXTCLOUD_URL ?? "",
    adminUser: stored?.adminUser ?? process.env.NEXTCLOUD_ADMIN_USER ?? "",
    // el password nunca se devuelve
  });
});

const putSchema = z.object({
  provider: z.literal("NEXTCLOUD"), // GDRIVE: implementación futura (FR-037)
  url: z.string().url(),
  adminUser: z.string().min(1),
  adminPassword: z.string().min(1).optional(),
});

export const PUT = withApi(async (req) => {
  await requireSuperAdmin();
  const body = putSchema.parse(await req.json());

  const current = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const prev = current?.storageConfig as { adminPasswordEnc?: string } | null;

  const storageConfig = {
    url: body.url,
    adminUser: body.adminUser,
    adminPasswordEnc: body.adminPassword
      ? encryptSecret(body.adminPassword)
      : (prev?.adminPasswordEnc ?? null),
  };

  await prisma.accessConfig.upsert({
    where: { id: 1 },
    create: { id: 1, storageProvider: body.provider, storageConfig },
    update: { storageProvider: body.provider, storageConfig },
  });
  return NextResponse.json({ ok: true });
});
