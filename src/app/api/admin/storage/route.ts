import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { ApiError, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { encryptSecret } from "@/lib/crypto";
import { googleDriveConfig, type StoredGoogleDriveConfig } from "@/lib/storage";
import { GoogleDriveProvider } from "@/lib/storage/gdrive";

/** Módulo de conexión del almacenamiento (FR-037). Solo SUPERADMIN. */

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const provider = config?.storageProvider ?? "NEXTCLOUD";

  if (provider === "GDRIVE") {
    const gd = config?.storageConfig as StoredGoogleDriveConfig | null;
    return NextResponse.json({
      provider: "GDRIVE",
      connected: Boolean(gd?.refreshTokenEnc), // nunca se devuelve el token
      connectedEmail: gd?.connectedEmail ?? null,
      sharedDriveId: gd?.sharedDriveId ?? "",
      rootFolderId: gd?.rootFolderId ?? "",
      orgName: gd?.orgName ?? "",
      // Empresa por defecto (variable de entorno), si no se define en el panel.
      defaultOrgName: process.env.GENWORK_ORG ?? "",
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
    /** Carpeta donde vive `GENWORK_<EMPRESA>`; vacío/null = raíz del Drive. */
    rootFolderId: z.string().nullable().optional(),
    /** Empresa; vacío/null = la de `GENWORK_ORG`. */
    orgName: z.string().max(80).nullable().optional(),
  }),
]);

export const PUT = withApi(async (req) => {
  await requireSuperAdmin();
  const body = putSchema.parse(await req.json());

  const current = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const prev = (current?.storageConfig as Record<string, unknown> | null) ?? {};

  if (body.provider === "GDRIVE") {
    // Mergea sin tocar refreshTokenEnc/connectedEmail (los setea el OAuth).
    const overrides: Partial<StoredGoogleDriveConfig> = {
      sharedDriveId: body.sharedDriveId || null,
      ...(body.rootFolderId !== undefined ? { rootFolderId: body.rootFolderId || null } : {}),
      ...(body.orgName !== undefined ? { orgName: body.orgName?.trim() || null } : {}),
    };

    // Con la cuenta conectada: se valida la carpeta elegida y, si cambió la
    // ubicación o la empresa, se mueve/renombra `GENWORK_<EMPRESA>` entero.
    let relocation: "moved" | "unchanged" | "none" = "none";
    const toCfg = googleDriveConfig(prev, overrides);
    if (toCfg) {
      const target = new GoogleDriveProvider(toCfg);
      const fromCfg = current?.storageProvider === "GDRIVE" ? googleDriveConfig(prev) : null;
      try {
        if (toCfg.rootFolderId) await target.folderPath(toCfg.rootFolderId);
        if (fromCfg) relocation = await new GoogleDriveProvider(fromCfg).relocateGenworkRoot(target);
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        const message = (err as Error).message;
        if (code === "ALREADY_EXISTS") throw new ApiError(409, "ALREADY_EXISTS", message);
        if (code === "NOT_FOUND" || code === "NOT_FOLDER" || code === "INVALID_TARGET") {
          throw new ApiError(400, "INVALID_FOLDER", message);
        }
        throw new ApiError(502, "STORAGE_UNAVAILABLE", `No se pudo actualizar la carpeta en Google Drive: ${message}`);
      }
    }

    const storageConfig = { ...prev, ...overrides };
    await prisma.accessConfig.upsert({
      where: { id: 1 },
      create: { id: 1, storageProvider: "GDRIVE", storageConfig },
      update: { storageProvider: "GDRIVE", storageConfig },
    });
    return NextResponse.json({ ok: true, relocation });
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
