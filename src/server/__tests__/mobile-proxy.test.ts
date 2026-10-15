import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const current = vi.hoisted(() => ({ role: "CLIENT" as string | null }));
vi.mock("@/server/mobile-auth", () => ({
  extractMobileToken: (value: string | null) => value?.startsWith("Bearer genwork_mob_") ? value.substring(7) : null,
  userFromMobileToken: vi.fn(async () => current.role == null ? null : { id: "u", globalRole: current.role }),
}));
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn(async () => null) }));
import { proxy } from "@/proxy";

function request(path: string, cookie = false) {
  return new NextRequest(`http://localhost${path}`, { headers: { Authorization: "Bearer genwork_mob_test", ...(cookie ? { Cookie: "authjs.session-token=old-cookie" } : {}) } });
}
describe("límites del Bearer móvil", () => {
  beforeEach(() => { current.role = "CLIENT"; });
  it.each(["/api/portal/works", "/api/portal/stream", "/api/me", "/api/auth/mobile/logout"])("cliente alcanza %s", async (path) => {
    expect((await proxy(request(path))).headers.get("x-middleware-next")).toBe("1");
  });
  it.each(["/api/works", "/api/board", "/api/admin/users", "/api/portalish"])("cliente no alcanza %s", async (path) => {
    expect((await proxy(request(path))).status).toBe(403);
  });
  it("una cookie interna no amplía el Bearer del cliente", async () => {
    expect((await proxy(request("/api/works", true))).status).toBe(403);
  });
  it("un Bearer revocado responde 401 aunque haya cookie", async () => {
    current.role = null;
    expect((await proxy(request("/api/portal/works", true))).status).toBe(401);
  });
  it.each(["MEMBER", "SUPERADMIN", "READER"])("%s pasa a los guards de cada recurso", async (role) => {
    current.role = role;
    expect((await proxy(request("/api/board"))).headers.get("x-middleware-next")).toBe("1");
  });
});
