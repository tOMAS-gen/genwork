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
  const provider = config?.storageProvider ?? "NEXTCLOUD";

  if (provider === "GDRIVE") {
    const gd = config?.storageConfig as {
      refreshTokenEnc?: string;
      connectedEmail?: string;
      sharedDriveId?: string;
      rootFolderId?: string;
    } | null;
    return NextResponse.json({
      provider: "GDRIVE",
      connected: Boolean(gd?.refreshTokenEnc), // nunca se devuelve el token
      connectedEmail: gd?.connectedEmail ?? null,
      sharedDriveId: gd?.sharedDriveId ?? "",
      rootFolderId: gd?.rootFolderId ?? "",
    });
  }

  const stored = config?.storageConfig as { url?: string; adminUser?: string } | null;
  return NextResponse.json({
    provider: "NEXTCLOUD",
    url: stored?.url ?? process.env.NEXTCLOUD_URL ?? "",
    adminUser: stored?.adminUser ?? process.env.NEXTCLOUD_ADMIN_USER ?? "",
    // el password nunca se devuelve
  });
});

const putSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("NEXTCLOUD"),
    url: z.string().url(),
    adminUser: z.string().min(1),
    adminPassword: z.string().min(1).optional(),
  }),
  z.object({
    provider: z.literal("GDRIVE"),
    sharedDriveId: z.string().optional(),
    rootFolderId: z.string().optional(),
  }),
]);

export const PUT = withApi(async (req) => {
  await requireSuperAdmin();
  const body = putSchema.parse(await req.json());

  const current = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const prev = (current?.storageConfig as Record<string, unknown> | null) ?? {};

  if (body.provider === "GDRIVE") {
    // Mergea sharedDrive/rootFolder sin tocar refreshTokenEnc/connectedEmail (los setea el OAuth).
    const storageConfig = {
      ...prev,
      sharedDriveId: body.sharedDriveId || null,
      ...(body.rootFolderId ? { rootFolderId: body.rootFolderId } : {}),
    };
    await prisma.accessConfig.upsert({
      where: { id: 1 },
      create: { id: 1, storageProvider: "GDRIVE", storageConfig },
      update: { storageProvider: "GDRIVE", storageConfig },
    });
    return NextResponse.json({ ok: true });
  }

  const storageConfig = {
    url: body.url,
    adminUser: body.adminUser,
    adminPasswordEnc: body.adminPassword
      ? encryptSecret(body.adminPassword)
      : ((prev as { adminPasswordEnc?: string }).adminPasswordEnc ?? null),
  };
  await prisma.accessConfig.upsert({
    where: { id: 1 },
    create: { id: 1, storageProvider: "NEXTCLOUD", storageConfig },
    update: { storageProvider: "NEXTCLOUD", storageConfig },
  });
  return NextResponse.json({ ok: true });
});
