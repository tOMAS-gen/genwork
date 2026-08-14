import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isPathAllowedForClient } from "@/lib/domain/access/portalPaths";

/**
 * Sin sesión no se ve nada (FR-017): toda ruta salvo /login y /api/auth requiere
 * cookie de sesión; la validación completa la hace cada handler/página.
 *
 * `/api/mcp` queda afuera de este gate: el servidor MCP no usa cookie de sesión,
 * se autentica con un token Bearer propio (`requireMcpConnection`, feature 039).
 *
 * Feature 059: además, una cuenta de cliente externo solo alcanza el portal. Este
 * gate es defensa en profundidad y experiencia de uso, no la única barrera: los
 * datos ya están cerrados por los guards (`requireInternal`) y por el motor de
 * permisos, que devuelve `none` a un CLIENT en todo camino por ámbito.
 *
 * Invariante: este middleware solo AGREGA restricciones, nunca las quita. Si el
 * token no se puede decodificar, se cae al comportamiento anterior.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/mcp");

  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");

  if (!isPublic && !hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Iniciá sesión para continuar" } },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && !isPathAllowedForClient(pathname)) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (token?.globalRole === "CLIENT") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Tu cuenta solo tiene acceso al portal de cliente",
            },
          },
          { status: 403 },
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|site.webmanifest).*)"],
};
