import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import packageJson from "../../../../package.json";

/** Versión del sistema y entorno (dev/producción), para mostrar en Configuración. */
export const GET = withApi(async () => {
  await requireSession();
  return NextResponse.json({
    version: packageJson.version,
    environment: process.env.DEV_AUTH === "true" ? "development" : "production",
  });
});
