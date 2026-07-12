import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Sin sesión no se ve nada (FR-017): toda ruta salvo /login y /api/auth requiere
 * cookie de sesión; la validación completa la hace cada handler/página.
 *
 * `/api/mcp` queda afuera de este gate: el servidor MCP no usa cookie de sesión,
 * se autentica con un token Bearer propio (`requireMcpConnection`, feature 039).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/mcp");
  if (isPublic) return NextResponse.next();

  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
