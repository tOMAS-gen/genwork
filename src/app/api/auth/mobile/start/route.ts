import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth, DEV_AUTH_ENABLED, signIn, signOut } from "@/server/auth";
import {
  canUseMobileApp,
  isValidCodeChallenge,
  issueAuthCode,
  mobileCallbackUrl,
} from "@/server/mobile-auth";

const MARKER_COOKIE = "genwork_mobile_login";
const DONE_COOKIE = "genwork_mobile_done";
const MARKER_PATH = "/api/auth/mobile";
const MARKER_MAX_AGE_S = 10 * 60;

/** Marca del intento: HMAC con el secreto del servidor (no forjable por inyección de cookies). */
function attemptHash(challenge: string, state: string): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "genwork-mobile-dev";
  return createHmac("sha256", secret).update(`${challenge}.${state}`).digest("hex");
}

/**
 * Feature 064: inicio del login móvil, abierto en el navegador del sistema
 * (ASWebAuthenticationSession / Auth Tab). Todo ingreso de la app es una autenticación
 * nueva y no deja sesión web en el navegador: una sesión web previa se descarta (no se
 * reutiliza) y la creada por este login se cierra apenas se emite el código.
 *
 * Una cookie-marca ligada a este intento (hash de challenge+state, sin secretos)
 * distingue «sesión creada por este login» de «sesión previa». Sin sesión: marca el
 * intento y pasa por Google o /login, y vuelve acá; con sesión + marca emite un código
 * de un solo uso, cierra la sesión web y redirige a `genwork://auth`.
 *
 * Idempotente por intento: tras emitir el código se deja una cookie `done` (intento +
 * código); un GET repetido (RSC, prefetch, reintento) sin sesión repite el mismo
 * redirect con el mismo código en vez de volver al login.
 *
 * Errores de parámetros responden 400 en el navegador (la app no los recibe porque
 * nunca debería mandarlos mal); un rol sin acceso vuelve a la app con `error`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("code_challenge") ?? "";
  const method = url.searchParams.get("code_challenge_method") ?? "S256";
  const state = url.searchParams.get("state") ?? "";

  if (!isValidCodeChallenge(challenge) || method !== "S256" || !state || state.length > 128) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Pedido de login móvil inválido" } },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const mark = attemptHash(challenge, state);
  const marked = jar.get(MARKER_COOKIE)?.value === mark;
  const clearMarker = () => jar.delete({ name: MARKER_COOKIE, path: MARKER_PATH });
  const cookieOpts = (secure: boolean) => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: MARKER_PATH,
    maxAge: MARKER_MAX_AGE_S,
  });
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
  const secure = url.protocol === "https:" || baseUrl.startsWith("https:");

  const session = await auth();

  const doneValue = jar.get(DONE_COOKIE)?.value;
  if (!session?.user?.id && doneValue?.startsWith(`${mark}.`)) {
    // Reintento de un intento ya completado: mismo código, sin reemitir ni ir al login.
    const code = doneValue.slice(mark.length + 1);
    return NextResponse.redirect(mobileCallbackUrl({ code, state }));
  }
  if (session?.user?.id && doneValue && !marked) {
    jar.delete({ name: DONE_COOKIE, path: MARKER_PATH });
  }

  if (session?.user?.id && marked) {
    // Sesión creada por este login: emitir el código y descartar la sesión web.
    if (!canUseMobileApp(session.user.globalRole)) {
      await signOut({ redirect: false });
      clearMarker();
      return NextResponse.redirect(mobileCallbackUrl({ error: "forbidden", state }));
    }
    try {
      const code = await issueAuthCode(session.user.id, challenge);
      await signOut({ redirect: false });
      clearMarker();
      jar.set(DONE_COOKIE, `${mark}.${code}`, cookieOpts(secure));
      return NextResponse.redirect(mobileCallbackUrl({ code, state }));
    } catch {
      clearMarker();
      return NextResponse.redirect(mobileCallbackUrl({ error: "server_error", state }));
    }
  }

  // Sesión web previa (no creada por este intento): se descarta, no se reutiliza.
  if (session?.user?.id) await signOut({ redirect: false });

  // La marca va antes de signIn: su redirect (lanzado) la incluye en la respuesta.
  jar.set(MARKER_COOKIE, mark, cookieOpts(secure));

  const returnTo = `${url.pathname}${url.search}`;
  if (!DEV_AUTH_ENABLED) {
    // Directo al selector de Google y vuelta acá (sin la pantalla /login). `signIn`
    // lanza el redirect de Next: debe propagarse, no se captura.
    await signIn("google", { redirectTo: returnTo });
  }
  const login = new URL("/login", baseUrl);
  login.searchParams.set("callbackUrl", returnTo);
  return NextResponse.redirect(login);
}
