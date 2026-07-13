import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCode } from "@/lib/storage/google-auth";
import { verifyLinkState } from "../state";

/**
 * Callback del OAuth incremental de Google Drive por USUARIO (feature 051, T008).
 * Verifica el `state` firmado (HMAC) para recuperar el userId, intercambia el
 * `code` por tokens, cifra el refresh token del usuario y hace upsert de su
 * `StorageIdentity` (provider GDRIVE). Redirige a ajustes con éxito/error.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
  const base = baseUrl.replace(/\/$/, "");

  const ok = () => NextResponse.redirect(`${base}/settings?storageLink=ok`);
  const fail = () => NextResponse.redirect(`${base}/settings?storageLink=error`);

  if (url.searchParams.get("error")) return fail();

  const code = url.searchParams.get("code");
  const userId = verifyLinkState(url.searchParams.get("state"));
  if (!code || !userId) return fail();

  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return fail();

  const redirectUri = `${base}/api/auth/storage-link/google-drive/callback`;

  try {
    const { refreshToken } = await exchangeCode({ clientId, clientSecret, code, redirectUri });
    const gdriveRefreshTokenEnc = encryptSecret(refreshToken);

    await prisma.storageIdentity.upsert({
      where: { userId_provider: { userId, provider: "GDRIVE" } },
      create: { userId, provider: "GDRIVE", gdriveRefreshTokenEnc, revokedAt: null },
      update: { gdriveRefreshTokenEnc, linkedAt: new Date(), revokedAt: null },
    });

    return ok();
  } catch {
    return fail();
  }
}
