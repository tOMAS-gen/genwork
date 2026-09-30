import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getStorageStatus } from "@/server/storage-status";
import packageJson from "../../../../package.json";

/** Versión, entorno (dev/producción) y estado de la nube, para mostrar en Mi cuenta. */
export const GET = withApi(async () => {
  await requireInternal();
  return NextResponse.json({
    version: packageJson.version,
    environment: process.env.DEV_AUTH === "true" ? "development" : "production",
    storage: await getStorageStatus(),
  });
});
