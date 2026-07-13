import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { buildConsentUrl } from "@/lib/storage/google-auth";
import { signLinkState } from "../state";

/**
 * Inicia el flujo OAuth incremental de Google Drive por USUARIO (feature 051, T008).
 * Requiere sesión. Pide el scope acotado `drive.file` (R2 — NO Drive completo) con
 * acceso offline + `prompt=consent` para recibir el refresh token del usuario.
 *
 * A diferencia del OAuth del ADMIN (feature 034), acá el `state` va firmado con
 * HMAC(AUTH_SECRET) y codifica el `userId` de la sesión, para que el callback sepa
 * (de forma verificable, sin cookie) a qué usuario vincular la cuenta.
 */

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export async function GET(req: Request) {
  const session = await requireSession();

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const base = baseUrl.replace(/\/$/, "");

  const fail = () => NextResponse.redirect(`${base}/settings?storageLink=error`);

  const clientId = process.env.GDRIVE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return fail();

  let state: string;
  try {
    state = signLinkState(session.user.id);
  } catch {
    return fail();
  }

  const redirectUri = `${base}/api/auth/storage-link/google-drive/callback`;
  const url = buildConsentUrl({ clientId, redirectUri, state, scope: DRIVE_FILE_SCOPE });

  return NextResponse.redirect(url);
}
