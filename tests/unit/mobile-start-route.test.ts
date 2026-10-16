import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  dev: false,
  session: null as null | { user: { id: string; globalRole: string } },
  signIn: vi.fn(),
  signOut: vi.fn(),
  incoming: {} as Record<string, string>,
  sets: [] as { name: string; value: string; options: Record<string, unknown> }[],
  deletes: [] as { name: string; path?: string }[],
  issueAuthCode: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: async () => h.session,
  signIn: h.signIn,
  signOut: h.signOut,
  get DEV_AUTH_ENABLED() {
    return h.dev;
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name in h.incoming ? { name, value: h.incoming[name] } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      h.sets.push({ name, value, options });
      h.incoming[name] = value;
    },
    delete: (arg: string | { name: string; path?: string }) => {
      const o = typeof arg === "string" ? { name: arg } : arg;
      h.deletes.push(o);
      delete h.incoming[o.name];
    },
  }),
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
const MARKER = "genwork_mobile_login";
process.env.AUTH_SECRET = "test-secret";
const hashFor = (challenge: string, state: string) =>
  createHmac("sha256", "test-secret").update(`${challenge}.${state}`).digest("hex");
const DONE = "genwork_mobile_done";
const MARK = hashFor(CHALLENGE, "st1");
const returnTo = `/api/auth/mobile/start?${query}`;

const markerSets = () => h.sets.filter((c) => c.name === MARKER);
const markerCleared = () => h.deletes.some((d) => d.name === MARKER);

describe("GET /api/auth/mobile/start", () => {
  beforeEach(() => {
    h.dev = false;
    h.session = null;
    h.incoming = {};
    h.sets = [];
    h.deletes = [];
    h.signIn.mockReset();
    h.signOut.mockReset().mockResolvedValue({});
    h.issueAuthCode.mockReset().mockResolvedValue("CODE1");
  });

  it("sin sesión y sin dev auth: marca el intento e inicia Google con el mismo path+query", async () => {
    h.signIn.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(req())).rejects.toThrow("NEXT_REDIRECT");
    expect(h.signIn).toHaveBeenCalledWith("google", { redirectTo: returnTo });
    expect(markerSets()).toHaveLength(1);
    expect(markerSets()[0].value).toBe(MARK);
    expect(markerSets()[0].options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/api/auth/mobile",
      maxAge: 600,
    });
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it("sin sesión con dev auth: marca el intento y redirige a /login?callbackUrl", async () => {
    h.dev = true;
    const res = await GET(req());
    expect(h.signIn).not.toHaveBeenCalled();
    expect(markerSets()[0].value).toBe(MARK);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("callbackUrl")).toBe(returnTo);
  });

  it("sesión + marca de este intento: emite código, descarta la sesión web y limpia la marca", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = MARK;
    const res = await GET(req());
    expect(h.issueAuthCode).toHaveBeenCalledWith("u1", CHALLENGE);
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(markerCleared()).toBe(true);
    expect(h.deletes.find((d) => d.name === MARKER)?.path).toBe("/api/auth/mobile");
    expect(res.headers.get("location")).toBe("genwork://auth?code=CODE1&state=st1");
    expect(h.signIn).not.toHaveBeenCalled();
  });

  it("el código se emite antes de descartar la sesión", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = MARK;
    await GET(req());
    expect(h.issueAuthCode.mock.invocationCallOrder[0]).toBeLessThan(
      h.signOut.mock.invocationCallOrder[0],
    );
  });

  it("sesión + marca + rol sin acceso: error=forbidden, sesión descartada y marca limpia", async () => {
    h.session = { user: { id: "u1", globalRole: "READER_NONE" } };
    h.incoming[MARKER] = MARK;
    const res = await GET(req());
    expect(res.headers.get("location")).toBe("genwork://auth?error=forbidden&state=st1");
    expect(h.issueAuthCode).not.toHaveBeenCalled();
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(markerCleared()).toBe(true);
  });

  it("sesión previa sin marca (prod): la descarta, marca el intento, inicia Google y no emite código", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.signIn.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(req())).rejects.toThrow("NEXT_REDIRECT");
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(markerSets()[0].value).toBe(MARK);
    expect(h.signIn).toHaveBeenCalledWith("google", { redirectTo: returnTo });
    expect(h.issueAuthCode).not.toHaveBeenCalled();
  });

  it("sesión previa sin marca (dev auth): la descarta, marca y redirige a /login", async () => {
    h.dev = true;
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    const res = await GET(req());
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(markerSets()[0].value).toBe(MARK);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(h.issueAuthCode).not.toHaveBeenCalled();
  });

  it("sesión + marca de OTRO intento: se trata como sesión previa", async () => {
    h.dev = true;
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = hashFor("b".repeat(43), "otro");
    const res = await GET(req());
    expect(h.issueAuthCode).not.toHaveBeenCalled();
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(markerSets()[0].value).toBe(MARK);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("marca válida sin sesión (volvió sin loguearse): sigue el flujo sin sesión", async () => {
    h.dev = true;
    h.incoming[MARKER] = MARK;
    const res = await GET(req());
    expect(h.signOut).not.toHaveBeenCalled();
    expect(h.issueAuthCode).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("duplicados (RSC + navegación): el 2º y 3º GET sin sesión repiten el mismo código sin reemitir", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = MARK;
    const r1 = await GET(req());
    expect(r1.headers.get("location")).toBe("genwork://auth?code=CODE1&state=st1");
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    const done = h.sets.find((c) => c.name === DONE)!;
    expect(done.value).toBe(`${MARK}.CODE1`);
    expect(done.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/api/auth/mobile",
      maxAge: 600,
    });
    expect(markerCleared()).toBe(true);
    h.session = null;
    for (let i = 0; i < 2; i++) {
      const r = await GET(req());
      expect(r.headers.get("location")).toBe("genwork://auth?code=CODE1&state=st1");
    }
    expect(h.issueAuthCode).toHaveBeenCalledTimes(1);
    expect(h.signIn).not.toHaveBeenCalled();
    expect(markerSets()).toHaveLength(0);
  });

  it("cookie done de OTRO intento sin sesión: flujo normal con marca nueva", async () => {
    h.dev = true;
    h.incoming[DONE] = `${hashFor("b".repeat(43), "otro")}.CODEX`;
    const res = await GET(req());
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(markerSets()[0].value).toBe(MARK);
    expect(h.issueAuthCode).not.toHaveBeenCalled();
  });

  it("sesión + done viejo (sin marca): descarta el done y aplica las reglas normales", async () => {
    h.dev = true;
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[DONE] = `${MARK}.OLD`;
    const res = await GET(req());
    expect(h.deletes.some((d) => d.name === DONE)).toBe(true);
    expect(h.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(h.issueAuthCode).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("la marca es HMAC: un sha256 pelado forjado se rechaza como sesión previa", async () => {
    h.dev = true;
    const bare = createHash("sha256").update(`${CHALLENGE}.st1`).digest("hex");
    expect(MARK).not.toBe(bare);
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = bare;
    await GET(req());
    expect(h.issueAuthCode).not.toHaveBeenCalled();
    expect(h.signOut).toHaveBeenCalled();
  });

  it("signOut falla tras emitir: limpia la marca y responde server_error", async () => {
    h.session = { user: { id: "u1", globalRole: "ADMIN" } };
    h.incoming[MARKER] = MARK;
    h.signOut.mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.headers.get("location")).toBe("genwork://auth?error=server_error&state=st1");
    expect(markerCleared()).toBe(true);
    expect(h.sets.some((c) => c.name === DONE)).toBe(false);
  });

  it("challenge o state inválidos: 400 sin tocar cookies ni sesión", async () => {
    expect((await GET(req("code_challenge=x&state=st1"))).status).toBe(400);
    expect((await GET(req(`code_challenge=${CHALLENGE}`))).status).toBe(400);
    expect(h.signIn).not.toHaveBeenCalled();
    expect(h.signOut).not.toHaveBeenCalled();
    expect(h.sets).toHaveLength(0);
  });
});
