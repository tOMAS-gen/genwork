import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/server/guards";
import { buildConsentUrl, GMAIL_SEND_SCOPE } from "@/lib/storage/google-auth";

/**
 * Inicia el flujo OAuth para el email de recordatorios (feature 036, T018a).
 * Pide el scope gmail.send. Solo SUPERADMIN.
 */
export async function GET(req: Request) {
  await requireSuperAdmin();

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return NextResponse.redirect(new URL("/admin/reminders?gmail=error", req.url));
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/admin/reminders/gmail/callback`;
  const state = crypto.randomUUID();

  const url = buildConsentUrl({ clientId, redirectUri, state, scope: GMAIL_SEND_SCOPE });

  const res = NextResponse.redirect(url);
  res.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
