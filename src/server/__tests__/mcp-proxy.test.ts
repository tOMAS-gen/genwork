import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/mobile-auth", () => ({
  extractMobileToken: () => null,
  userFromMobileToken: vi.fn(),
}));
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn(async () => null) }));
import { proxy } from "@/proxy";

/**
 * claude.ai sondea el descubrimiento OAuth antes de conectar. Sin authorization
 * server, esas rutas deben llegar a Next (404), no redirigir a /login (307).
 */
describe("proxy y conector de claude.ai", () => {
  it.each([
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/api/mcp",
    "/.well-known/oauth-authorization-server",
  ])("%s sin sesión no redirige", async (path) => {
    const res = await proxy(new NextRequest(`http://localhost${path}`));
    expect(res.status).not.toBe(307);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("/api/mcp sigue sin pedir cookie", async () => {
    const res = await proxy(new NextRequest("http://localhost/api/mcp", { method: "POST" }));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("una página interna sin sesión sigue yendo a /login", async () => {
    const res = await proxy(new NextRequest("http://localhost/settings/claude"));
    expect(res.status).toBe(307);
  });
});
