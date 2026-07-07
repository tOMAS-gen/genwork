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
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");
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

  if (oauthError) {
    const publicOrigin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
    const expectedRedirectUri = `${publicOrigin.replace(/\/$/, "")}/api/admin/storage/google/callback`;
    const mapOAuthError = (error: string, description: string | null): string => {
      switch (error) {
        case "invalid_request":
          return `Error de configuración OAuth: verificá que el OAuth consent screen esté completo en Google Cloud Console y que la URI de redirección coincida con: ${expectedRedirectUri}`;
        case "access_denied":
          return "Se canceló la autorización, o tu cuenta no está como usuario de prueba en Google Cloud Console.";
        case "invalid_scope":
          return "El permiso de Drive no está habilitado. Agregá el scope en Google Cloud Console > OAuth consent screen > Scopes.";
        case "redirect_uri_mismatch":
          return `La URI de redirección no coincide con la registrada en Google Cloud Console. Registrá: ${expectedRedirectUri}`;
        default:
          return `Error de Google: ${error}. ${description ?? ""} Verificá la configuración en Google Cloud Console.`;
      }
    };
    return fail(mapOAuthError(oauthError, oauthErrorDescription));
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Estado inválido o expirado; reintentá la conexión.");
  }

  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  const publicOrigin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
  const redirectUri = `${publicOrigin.replace(/\/$/, "")}/api/admin/storage/google/callback`;

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
