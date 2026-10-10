import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { extractMobileToken, revokeMobileToken } from "@/server/mobile-auth";

/** Feature 064: cerrar sesión en la app revoca su token. Idempotente. */
export const POST = withApi(async (req) => {
  const token = extractMobileToken(req.headers.get("authorization"));
  if (token) await revokeMobileToken(token);
  return new NextResponse(null, { status: 204 });
});
