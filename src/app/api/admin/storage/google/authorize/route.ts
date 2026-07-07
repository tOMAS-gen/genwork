import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/server/guards";
import { buildConsentUrl } from "@/lib/storage/google-auth";

/**
 * Inicia el flujo OAuth de Google Drive (feature 034, T006). Solo SUPERADMIN.
 * Guarda un `state` CSRF en cookie httpOnly y redirige a la pantalla de consentimiento.
 */
export async function GET(req: Request) {
  await requireSuperAdmin();

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/admin/storage?gdrive=error&detail=${encodeURIComponent(msg)}`, req.url),
    );

  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return fail(
      "Falta configurar GDRIVE_CLIENT_ID (o GOOGLE_CLIENT_ID) en el servidor; contactá al administrador.",
    );
  }

  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientSecret) {
    return fail(
      "Falta configurar GDRIVE_CLIENT_SECRET (o GOOGLE_CLIENT_SECRET) en el servidor; contactá al administrador.",
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/admin/storage/google/callback`;
  const state = crypto.randomUUID();

  const url = buildConsentUrl({ clientId, redirectUri, state });

  const res = NextResponse.redirect(url);
  res.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });
  return res;
}
