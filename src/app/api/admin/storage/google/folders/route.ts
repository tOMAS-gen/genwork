import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ApiError, conflict, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { googleDriveConfig } from "@/lib/storage";
import { GoogleDriveProvider } from "@/lib/storage/gdrive";

/**
 * Selector de carpetas del panel admin: lista las subcarpetas de `parent` en el
 * Drive de la cuenta principal (sin `parent`, la raíz: Mi unidad o el Shared
 * Drive). `sharedDriveId` permite navegar un Shared Drive aún no guardado.
 * Solo SUPERADMIN.
 */
export const GET = withApi(async (req) => {
  await requireSuperAdmin();
  const { searchParams } = new URL(req.url);
  const parent = searchParams.get("parent") || undefined;
  const sharedDriveId = searchParams.get("sharedDriveId");

  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const cfg = googleDriveConfig(
    config?.storageConfig,
    sharedDriveId !== null ? { sharedDriveId: sharedDriveId || null } : {},
  );
  if (!cfg) throw conflict("Primero conectá la cuenta de Google");

  try {
    return NextResponse.json(await new GoogleDriveProvider(cfg).browseFolders(parent));
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "NOT_FOUND" || code === "NOT_FOLDER") {
      throw new ApiError(400, "INVALID_FOLDER", (err as Error).message);
    }
    throw new ApiError(502, "STORAGE_UNAVAILABLE", `Google Drive no disponible: ${(err as Error).message}`);
  }
});
