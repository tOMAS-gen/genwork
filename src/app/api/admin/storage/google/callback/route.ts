import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSuperAdmin } from "@/server/guards";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCode } from "@/lib/storage/google-auth";

/**
 * Callback OAuth de Google Drive (feature 034, T007). Solo SUPERADMIN.
 * Valida el `state`, intercambia el `code` por el refresh token, lo guarda
 * cifrado y activa Google Drive como proveedor.
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
    .find((c) => c.startsWith("gdrive_oauth_state="))
    ?.split("=")[1];

  const fail = (msg: string) => {
    const res = NextResponse.redirect(
      new URL(`/admin/storage?gdrive=error&detail=${encodeURIComponent(msg)}`, req.url),
    );
    res.cookies.delete("gdrive_oauth_state");
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Estado inválido o expirado; reintentá la conexión.");
  }

  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = `${url.origin}/api/admin/storage/google/callback`;

  try {
    const { refreshToken, email } = await exchangeCode({ clientId, clientSecret, code, redirectUri });

    const current = await prisma.accessConfig.findUnique({ where: { id: 1 } });
    const prev = (current?.storageConfig as Record<string, unknown> | null) ?? {};
    const storageConfig = {
      ...prev,
      refreshTokenEnc: encryptSecret(refreshToken),
      ...(email ? { connectedEmail: email } : {}),
    };

    await prisma.accessConfig.upsert({
      where: { id: 1 },
      create: { id: 1, storageProvider: "GDRIVE", storageConfig },
      update: { storageProvider: "GDRIVE", storageConfig },
    });

    const res = NextResponse.redirect(new URL("/admin/storage?gdrive=connected", req.url));
    res.cookies.delete("gdrive_oauth_state");
    return res;
  } catch (err) {
    return fail((err as Error).message);
  }
}
