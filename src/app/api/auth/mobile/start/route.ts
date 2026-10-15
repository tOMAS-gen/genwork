import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  canUseMobileApp,
  isValidCodeChallenge,
  issueAuthCode,
  mobileCallbackUrl,
} from "@/server/mobile-auth";

/**
 * Feature 064: inicio del login móvil, abierto en el navegador del sistema
 * (ASWebAuthenticationSession / Auth Tab). Sin sesión web pasa por /login y vuelve
 * acá; con sesión emite un código de un solo uso y redirige a `genwork://auth`.
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

  const session = await auth();
  if (!session?.user?.id) {
    const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? url.origin;
    const login = new URL("/login", baseUrl);
    login.searchParams.set("callbackUrl", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login);
  }

  if (!canUseMobileApp(session.user.globalRole)) {
    return NextResponse.redirect(mobileCallbackUrl({ error: "forbidden", state }));
  }

  const code = await issueAuthCode(session.user.id, challenge);
  return NextResponse.redirect(mobileCallbackUrl({ code, state }));
}
