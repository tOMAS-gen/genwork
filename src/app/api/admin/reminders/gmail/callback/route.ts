import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSuperAdmin } from "@/server/guards";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCode } from "@/lib/storage/google-auth";

/**
 * Callback OAuth del email de recordatorios (feature 036, T018a). Solo SUPERADMIN.
 * Guarda el refresh token con scope gmail.send cifrado en AccessConfig.reminderEmailConfig.
 */
export async function GET(req: Request) {
  await requireSuperAdmin();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gmail_oauth_state="))
    ?.split("=")[1];

  const fail = (msg: string) => {
    const res = NextResponse.redirect(
      new URL(`/admin/reminders?gmail=error&detail=${encodeURIComponent(msg)}`, req.url),
    );
    res.cookies.delete("gmail_oauth_state");
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Estado inválido o expirado; reintentá la conexión.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = `${url.origin}/api/admin/reminders/gmail/callback`;

  try {
    const { refreshToken, email } = await exchangeCode({ clientId, clientSecret, code, redirectUri });

    const gmail = {
      refreshToken: encryptSecret(refreshToken),
      ...(email ? { fromEmail: email } : {}),
    };
    await prisma.accessConfig.upsert({
      where: { id: 1 },
      create: { id: 1, reminderEmailConfig: { provider: "gmail", gmail } },
      update: { reminderEmailConfig: { provider: "gmail", gmail } },
    });

    const res = NextResponse.redirect(new URL("/admin/reminders?gmail=connected", req.url));
    res.cookies.delete("gmail_oauth_state");
    return res;
  } catch (err) {
    return fail((err as Error).message);
  }
}
