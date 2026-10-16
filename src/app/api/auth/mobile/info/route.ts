import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/reminders/link";
import { systemName } from "@/lib/mobile/connect";

/**
 * Feature 064: la app móvil pide la URL del sistema en el primer inicio y la valida
 * contra este endpoint público antes de guardarla. No expone datos sensibles: solo
 * confirma que del otro lado hay un genwork con login móvil y cómo se llama
 * (`name`, para distinguir servidores en la lista de la app).
 */
export function GET() {
  return NextResponse.json({
    app: "genwork",
    mobileApi: 1,
    name: systemName(appBaseUrl(), process.env.SYSTEM_NAME),
    auth: {
      startPath: "/api/auth/mobile/start",
      tokenPath: "/api/auth/mobile/token",
      callbackScheme: "genwork",
    },
  });
}
