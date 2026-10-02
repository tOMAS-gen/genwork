import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getStorageStatus } from "@/server/storage-status";
import packageJson from "../../../../package.json";

/** Versión, commit del build, entorno (dev/producción) y estado de la nube, para mostrar en Mi cuenta. */
export const GET = withApi(async () => {
  await requireInternal();
  return NextResponse.json({
    version: packageJson.version,
    commit: process.env.GIT_SHA || null,
    environment: process.env.DEV_AUTH === "true" ? "development" : "production",
    storage: await getStorageStatus(),
  });
});
