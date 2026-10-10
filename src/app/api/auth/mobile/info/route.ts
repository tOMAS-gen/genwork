import { NextResponse } from "next/server";

/**
 * Feature 064: la app móvil pide la URL del sistema en el primer inicio y la valida
 * contra este endpoint público antes de guardarla. No expone datos: solo confirma
 * que del otro lado hay un genwork con login móvil.
 */
export function GET() {
  return NextResponse.json({
    app: "genwork",
    mobileApi: 1,
    auth: {
      startPath: "/api/auth/mobile/start",
      tokenPath: "/api/auth/mobile/token",
      callbackScheme: "genwork",
    },
  });
}
