import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  dev: false,
  session: null as null | { user: { id: string; globalRole: string } },
  signIn: vi.fn(),
  issueAuthCode: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: async () => h.session,
  signIn: h.signIn,
  get DEV_AUTH_ENABLED() {
    return h.dev;
  },
}));
vi.mock("@/server/mobile-auth", () => ({
  canUseMobileApp: (role: string) => role !== "READER_NONE",
  isValidCodeChallenge: (c: string) => c.length >= 43,
  issueAuthCode: h.issueAuthCode,
  mobileCallbackUrl: (p: Record<string, string>) =>
    `genwork://auth?${new URLSearchParams(p).toString()}`,
}));

import { GET } from "@/app/api/auth/mobile/start/route";

const CHALLENGE = "a".repeat(43);
const query = `code_challenge=${CHALLENGE}&code_challenge_method=S256&state=st1`;
const req = (q = query) => new Request(`https://work.test/api/auth/mobile/start?${q}`);

describe("GET /api/auth/mobile/start", () => {
  beforeEach(() => {
    h.dev = false;
    h.session = null;
    h.signIn.mockReset();
    h.issueAuthCode.mockReset().mockResolvedValue("CODE1");
  });

  it("sin sesión y sin dev auth: inicia Google con el mismo path+query", async () => {
    h.signIn.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(req())).rejects.toThrow("NEXT_REDIRECT");
    expect(h.signIn).toHaveBeenCalledWith("google", {
      redirectTo: `/api/auth/mobile/start?${query}`,
    });
  });

  it("sin sesión con dev auth: redirige a /login?callbackUrl", async () => {
    h.dev = true;
    const res = await GET(req());
    expect(h.signIn).not.toHaveBeenCalled();
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("callbackUrl")).toBe(`/api/auth/mobile/start?${query}`);
  });

  it("con sesión: emite código y redirige a la app", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    const res = await GET(req());
    expect(h.issueAuthCode).toHaveBeenCalledWith("u1", CHALLENGE);
    expect(res.headers.get("location")).toBe("genwork://auth?code=CODE1&state=st1");
    expect(h.signIn).not.toHaveBeenCalled();
  });

  it("rol sin acceso: error=forbidden", async () => {
    h.session = { user: { id: "u1", globalRole: "READER_NONE" } };
    const res = await GET(req());
    expect(res.headers.get("location")).toBe("genwork://auth?error=forbidden&state=st1");
    expect(h.issueAuthCode).not.toHaveBeenCalled();
  });

  it("challenge o state inválidos: 400", async () => {
    expect((await GET(req("code_challenge=x&state=st1"))).status).toBe(400);
    expect((await GET(req(`code_challenge=${CHALLENGE}`))).status).toBe(400);
    expect(h.signIn).not.toHaveBeenCalled();
  });
});
