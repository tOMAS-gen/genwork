import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth, DEV_AUTH_ENABLED, signIn, signOut } from "@/server/auth";
import {
  canUseMobileApp,
  isValidCodeChallenge,
  issueAuthCode,
  mobileCallbackUrl,
  sha256Hex,
} from "@/server/mobile-auth";

const MARKER_COOKIE = "genwork_mobile_login";
const MARKER_PATH = "/api/auth/mobile";
const MARKER_MAX_AGE_S = 10 * 60;

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
  const mark = sha256Hex(`${challenge}.${state}`);
  const marked = jar.get(MARKER_COOKIE)?.value === mark;
  const clearMarker = () => jar.delete({ name: MARKER_COOKIE, path: MARKER_PATH });

  const session = await auth();

  if (session?.user?.id && marked) {
    // Sesión creada por este login: emitir el código y descartar la sesión web.
    if (!canUseMobileApp(session.user.globalRole)) {
      await signOut({ redirect: false });
      clearMarker();
      return NextResponse.redirect(mobileCallbackUrl({ error: "forbidden", state }));
    }
    const code = await issueAuthCode(session.user.id, challenge);
    await signOut({ redirect: false });
    clearMarker();
    return NextResponse.redirect(mobileCallbackUrl({ code, state }));
  }

  // Sesión web previa (no creada por este intento): se descarta, no se reutiliza.
  if (session?.user?.id) await signOut({ redirect: false });

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
  // La marca va antes de signIn: su redirect (lanzado) la incluye en la respuesta.
  jar.set(MARKER_COOKIE, mark, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:" || baseUrl.startsWith("https:"),
    path: MARKER_PATH,
    maxAge: MARKER_MAX_AGE_S,
  });

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
