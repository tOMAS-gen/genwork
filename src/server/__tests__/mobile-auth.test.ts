import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Feature 064 — login de la app móvil: PKCE, uso único del código y roles con
 * acceso. La base se mockea: lo que se prueba es la decisión, no Prisma.
 */

const db = vi.hoisted(() => ({
  code: null as null | {
    id: string;
    userId: string;
    codeChallenge: string;
    expiresAt: Date;
    usedAt: Date | null;
    user: { id: string; email: string; name: string; globalRole: string; image: string | null };
  },
  claimCount: 1,
  session: null as null | {
    id: string;
    revokedAt: Date | null;
    user: { id: string; email: string; name: string; globalRole: string; image: string | null };
  },
  createdSessions: [] as unknown[],
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    mobileAuthCode: {
      findUnique: vi.fn(async () => db.code),
      updateMany: vi.fn(async () => ({ count: db.claimCount })),
      create: vi.fn(async () => ({})),
    },
    mobileSession: {
      create: vi.fn(async (args: unknown) => {
        db.createdSessions.push(args);
        return {};
      }),
      findUnique: vi.fn(async () => db.session),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

import {
  canUseMobileApp,
  extractMobileToken,
  isValidCodeChallenge,
  mobileCallbackUrl,
  pkceChallengeS256,
  redeemAuthCode,
  userFromMobileToken,
  verifyPkce,
} from "@/server/mobile-auth";

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const member = { id: "u1", email: "a@b.c", name: "Ana", globalRole: "MEMBER", image: null };

describe("PKCE", () => {
  it("calcula el challenge S256 del ejemplo de RFC 7636", () => {
    expect(pkceChallengeS256(VERIFIER)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("acepta el verifier correcto y rechaza otro", () => {
    const challenge = pkceChallengeS256(VERIFIER);
    expect(verifyPkce(VERIFIER, challenge)).toBe(true);
    expect(verifyPkce(VERIFIER.replace("d", "e"), challenge)).toBe(false);
  });

  it("rechaza verifiers fuera de RFC 7636", () => {
    expect(verifyPkce("corto", pkceChallengeS256("corto"))).toBe(false);
  });

  it("valida el formato del challenge", () => {
    expect(isValidCodeChallenge(pkceChallengeS256(VERIFIER))).toBe(true);
    expect(isValidCodeChallenge("plain")).toBe(false);
  });
});

describe("token Bearer", () => {
  it("solo reconoce tokens móviles", () => {
    expect(extractMobileToken("Bearer genwork_mob_abc")).toBe("genwork_mob_abc");
    expect(extractMobileToken("bearer   genwork_mob_abc ")).toBe("genwork_mob_abc");
    expect(extractMobileToken("Bearer genwork_mcp_abc")).toBeNull();
    expect(extractMobileToken(null)).toBeNull();
  });
});

describe("roles", () => {
  it("cliente y lector no usan la app", () => {
    expect(canUseMobileApp("MEMBER")).toBe(true);
    expect(canUseMobileApp("SUPERADMIN")).toBe(true);
    expect(canUseMobileApp("CLIENT")).toBe(false);
    expect(canUseMobileApp("READER")).toBe(false);
  });
});

describe("callback", () => {
  it("arma el deep link con los parámetros", () => {
    expect(mobileCallbackUrl({ code: "x y", state: "s" })).toBe("genwork://auth?code=x+y&state=s");
  });
});

describe("redeemAuthCode", () => {
  beforeEach(() => {
    db.code = {
      id: "c1",
      userId: "u1",
      codeChallenge: pkceChallengeS256(VERIFIER),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: { ...member },
    };
    db.claimCount = 1;
    db.createdSessions = [];
  });

  it("canjea un código válido por un token", async () => {
    const result = await redeemAuthCode("code", VERIFIER, "iPhone");
    expect(result?.token).toMatch(/^genwork_mob_/);
    expect(result?.user).toEqual(member);
    expect(db.createdSessions).toHaveLength(1);
  });

  it("rechaza código vencido", async () => {
    db.code!.expiresAt = new Date(Date.now() - 1);
    expect(await redeemAuthCode("code", VERIFIER, "iPhone")).toBeNull();
  });

  it("rechaza código ya usado", async () => {
    db.code!.usedAt = new Date();
    expect(await redeemAuthCode("code", VERIFIER, "iPhone")).toBeNull();
  });

  it("rechaza si otro canje ganó la carrera", async () => {
    db.claimCount = 0;
    expect(await redeemAuthCode("code", VERIFIER, "iPhone")).toBeNull();
    expect(db.createdSessions).toHaveLength(0);
  });

  it("rechaza verifier incorrecto", async () => {
    expect(await redeemAuthCode("code", "x".repeat(43), "iPhone")).toBeNull();
  });

  it("rechaza a un cliente externo", async () => {
    db.code!.user.globalRole = "CLIENT";
    expect(await redeemAuthCode("code", VERIFIER, "iPhone")).toBeNull();
  });

  it("rechaza código inexistente", async () => {
    db.code = null;
    expect(await redeemAuthCode("code", VERIFIER, "iPhone")).toBeNull();
  });
});

describe("userFromMobileToken", () => {
  it("devuelve el usuario de una sesión vigente", async () => {
    db.session = { id: "s1", revokedAt: null, user: { ...member } };
    expect(await userFromMobileToken("genwork_mob_x")).toEqual(member);
  });

  it("rechaza sesión revocada", async () => {
    db.session = { id: "s1", revokedAt: new Date(), user: { ...member } };
    expect(await userFromMobileToken("genwork_mob_x")).toBeNull();
  });

  it("rechaza si el rol cambió a lector después de emitido", async () => {
    db.session = { id: "s1", revokedAt: null, user: { ...member, globalRole: "READER" } };
    expect(await userFromMobileToken("genwork_mob_x")).toBeNull();
  });
});
