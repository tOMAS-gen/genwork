/* eslint-disable @typescript-eslint/no-explicit-any -- Partial Prisma doubles model the transaction boundary, not generated delegates. */
import { prisma } from "@/lib/db/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: null as any,
  flow: null as any,
  config: { storageConfig: { rootFolderId: "root" } },
  writes: [] as any[],
  claim: 1,
  count: 0,
}));
const exchange = vi.hoisted(() =>
  vi.fn(async () => ({
    refreshToken: "secret-refresh",
    accessToken: "access",
    email: "admin@test",
  })),
);
vi.mock("@/lib/storage/google-auth", () => ({
  GMAIL_SEND_SCOPE: "gmail.send",
  exchangeCode: exchange,
  buildConsentUrl: (input: any) => `https://accounts.google.com/auth?${new URLSearchParams(input)}`,
}));
vi.mock("@/lib/db/client", () => {
  const tx = {
    mobileSession: { findUnique: vi.fn(async () => db.session) },
    accessConfig: {
      findUnique: vi.fn(async () => db.config),
      upsert: vi.fn(async (args: any) => {
        db.writes.push(args);
      }),
    },
  };
  return {
    prisma: {
      ...tx,
      mobileIntegrationFlow: {
        count: vi.fn(async () => db.count),
        deleteMany: vi.fn(async () => ({})),
        create: vi.fn(async ({ data }: any) => {
          db.flow = {
            id: "flow",
            usedAt: null,
            codeEnc: null,
            error: null,
            ...data,
            session: db.session,
          };
          return db.flow;
        }),
        findUnique: vi.fn(async () => db.flow),
        updateMany: vi.fn(async ({ where, data }: any) => {
          if (
            !db.flow ||
            db.flow.usedAt ||
            (where.codeEnc === null && db.flow.codeEnc) ||
            db.flow.error ||
            db.claim !== 1
          )
            return { count: 0 };
          db.flow = { ...db.flow, ...data };
          return { count: 1 };
        }),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
  };
});
import {
  cancelMobileIntegration,
  startMobileIntegration,
  captureMobileIntegration,
  finishMobileIntegration,
} from "@/server/mobile-integrations";
import { pkceChallengeS256 } from "@/server/mobile-auth";
import { decryptSecret } from "@/lib/crypto";
const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wWFOEjXk_1234";
const authorization = "Bearer genwork_mob_test";
let url: URL;

beforeEach(async () => {
  vi.stubEnv("APP_ENCRYPTION_KEY", "ab".repeat(32));
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("AUTH_URL", "https://work.test");
  db.session = { id: "device", user: { globalRole: "SUPERADMIN" }, revokedAt: null };
  db.flow = null;
  db.writes = [];
  db.claim = 1;
  db.count = 0;
  exchange
    .mockReset()
    .mockResolvedValue({
      refreshToken: "secret-refresh",
      accessToken: "access",
      email: "admin@test",
    });
  const start = await startMobileIntegration(
    authorization,
    "https://ignored.test",
    "drive",
    pkceChallengeS256(verifier),
  );
  url = new URL("https://work.test/api/auth/mobile/integrations/callback");
  url.searchParams.set("state", new URL(start.url).searchParams.get("state")!);
  url.searchParams.set("code", "provider-code");
});

describe("mobile integration broker", () => {
  it("keeps mobile tokens and the verifier out of the browser URL", async () => {
    const result = await startMobileIntegration(
      authorization,
      "https://work.test",
      "gmail",
      pkceChallengeS256(verifier),
    );
    expect(result.url).not.toContain("genwork_mob_");
    expect(result.url).not.toContain(verifier);
    expect(result.url).toContain("gmail.send");
    expect(db.flow.stateHash).not.toBe(new URL(result.url).searchParams.get("state"));
    expect(db.flow.redirectUri).toBe("https://work.test/api/auth/mobile/integrations/callback");
  });
  it("requires a live mobile superadmin instead of a browser cookie", async () => {
    await expect(
      startMobileIntegration(null, "https://x", "drive", pkceChallengeS256(verifier)),
    ).rejects.toMatchObject({ status: 401 });
    db.session.user.globalRole = "MEMBER";
    await expect(
      startMobileIntegration(authorization, "https://x", "drive", pkceChallengeS256(verifier)),
    ).rejects.toMatchObject({ status: 403 });
    db.session.revokedAt = new Date();
    await expect(
      startMobileIntegration(authorization, "https://x", "drive", pkceChallengeS256(verifier)),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("rejects missing configuration and bad PKCE", async () => {
    await expect(
      startMobileIntegration(authorization, "https://x", "drive", "bad"),
    ).rejects.toMatchObject({ status: 400 });
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GDRIVE_CLIENT_SECRET", "");
    await expect(
      startMobileIntegration(authorization, "https://x", "drive", pkceChallengeS256(verifier)),
    ).rejects.toMatchObject({ code: "OAUTH_NOT_CONFIGURED" });
  });
  it("limits pending authorizations", async () => {
    db.count = 5;
    await expect(
      startMobileIntegration(authorization, "https://x", "drive", pkceChallengeS256(verifier)),
    ).rejects.toMatchObject({ status: 429 });
  });
  it("callback encrypts the code, without changing storage or exchanging tokens", async () => {
    const result = new URL(await captureMobileIntegration(url));
    expect(result.protocol).toBe("genwork:");
    expect(result.searchParams.get("flowId")).toBe("flow");
    expect(result.searchParams.has("error")).toBe(false);
    expect(decryptSecret(db.flow.codeEnc)).toBe("provider-code");
    expect(exchange).not.toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });
  it("rejects expired, missing, reused and revoked callback states", async () => {
    db.flow.expiresAt = new Date(0);
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
    db.flow.expiresAt = new Date(Date.now() + 10000);
    db.flow.usedAt = new Date();
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
    db.flow.usedAt = null;
    db.flow.session.revokedAt = new Date();
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
    db.flow = null;
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
  });
  it("callback cannot overwrite a previously captured authorization code", async () => {
    await captureMobileIntegration(url);
    url.searchParams.set("code", "other-code");
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
    expect(decryptSecret(db.flow.codeEnc)).toBe("provider-code");
  });
  it("provider cancellation never changes the configured integration", async () => {
    url.searchParams.set("error", "access_denied");
    expect(await captureMobileIntegration(url)).toContain("error=invalid");
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      status: 400,
    });
    expect(exchange).not.toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });
  it("requires the initiating device and its PKCE verifier", async () => {
    await captureMobileIntegration(url);
    await expect(
      finishMobileIntegration(authorization, "flow", "x".repeat(43)),
    ).rejects.toMatchObject({ status: 400 });
    db.session = { ...db.session, id: "different-device" };
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      status: 400,
    });
    expect(exchange).not.toHaveBeenCalled();
  });
  it("claims once, encrypts the token and preserves the folder configuration", async () => {
    await captureMobileIntegration(url);
    await finishMobileIntegration(authorization, "flow", verifier);
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "provider-code",
        redirectUri: "https://work.test/api/auth/mobile/integrations/callback",
      }),
    );
    const stored = db.writes[0].update.storageConfig;
    expect(stored.rootFolderId).toBe("root");
    expect(decryptSecret(stored.refreshTokenEnc)).toBe("secret-refresh");
    expect(db.flow.codeEnc).toBeNull();
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      status: 400,
    });
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it("cannot finish concurrently after losing the atomic claim", async () => {
    await captureMobileIntegration(url);
    db.claim = 0;
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      status: 400,
    });
    expect(exchange).not.toHaveBeenCalled();
  });
  it("Gmail writes only email configuration", async () => {
    db.flow.purpose = "gmail";
    await captureMobileIntegration(url);
    await finishMobileIntegration(authorization, "flow", verifier);
    expect(db.writes[0].update.storageConfig).toBeUndefined();
    expect(decryptSecret(db.writes[0].update.reminderEmailConfig.gmail.refreshToken)).toBe(
      "secret-refresh",
    );
  });
  it("rechecks revocation after exchanging with Google", async () => {
    await captureMobileIntegration(url);
    exchange.mockImplementationOnce(async () => {
      db.session.revokedAt = new Date();
      return { refreshToken: "r", accessToken: "a", email: "x" };
    });
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.writes).toEqual([]);
  });
  it("failed token exchange preserves existing configuration and does not expose provider details", async () => {
    await captureMobileIntegration(url);
    exchange.mockRejectedValueOnce(new Error("provider-code secret details"));
    await expect(finishMobileIntegration(authorization, "flow", verifier)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
    expect(db.writes).toEqual([]);
  });
  it("cancels only an unused flow belonging to the authenticated mobile session", async () => {
    await cancelMobileIntegration(authorization, "flow");
    expect(prisma.mobileIntegrationFlow.deleteMany).toHaveBeenLastCalledWith({
      where: { id: "flow", sessionId: db.session.id, usedAt: null },
    });
    db.session.user.globalRole = "MEMBER";
    await expect(cancelMobileIntegration(authorization, "flow")).rejects.toMatchObject({
      status: 403,
    });
  });
});
