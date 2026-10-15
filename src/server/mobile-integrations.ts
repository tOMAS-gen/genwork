import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { buildConsentUrl, exchangeCode, GMAIL_SEND_SCOPE } from "@/lib/storage/google-auth";
import { ApiError, badRequest, forbidden, unauthorized } from "@/server/api";
import {
  extractMobileToken,
  sha256Hex,
  isValidCodeChallenge,
  verifyPkce,
} from "@/server/mobile-auth";

export const INTEGRATION_TTL_MS = 10 * 60_000;
export type IntegrationPurpose = "drive" | "gmail";

/** No acepta cookies como sustituto de la sesión móvil que inició el flujo. */
async function requireMobileAdmin(authorization: string | null) {
  const token = extractMobileToken(authorization);
  if (!token) throw unauthorized();
  const session = await prisma.mobileSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt) throw unauthorized();
  if (session.user.globalRole !== "SUPERADMIN") throw forbidden();
  return session;
}
function credentials(purpose: IntegrationPurpose) {
  const clientId =
    (purpose === "drive" ? process.env.GDRIVE_CLIENT_ID : undefined) ||
    process.env.GOOGLE_CLIENT_ID ||
    "";
  const clientSecret =
    (purpose === "drive" ? process.env.GDRIVE_CLIENT_SECRET : undefined) ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "";
  if (!clientId || !clientSecret)
    throw new ApiError(
      409,
      "OAUTH_NOT_CONFIGURED",
      "Falta configurar la conexión de Google en el servidor.",
    );
  return { clientId, clientSecret };
}
export async function startMobileIntegration(
  authorization: string | null,
  origin: string,
  purpose: IntegrationPurpose,
  codeChallenge: string,
) {
  const session = await requireMobileAdmin(authorization);
  if (!isValidCodeChallenge(codeChallenge)) throw badRequest("Challenge PKCE inválido");
  const { clientId } = credentials(purpose);
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || origin).replace(/\/$/, "");
  const redirectUri = `${base}/api/auth/mobile/integrations/callback`;
  const state = randomBytes(32).toString("base64url");
  // Valida el cifrado antes de abrir Google, sin exponer ni guardar esta prueba.
  encryptSecret(state);
  await prisma.mobileIntegrationFlow.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (
    (await prisma.mobileIntegrationFlow.count({
      where: { sessionId: session.id, usedAt: null, error: null },
    })) >= 5
  ) {
    throw new ApiError(
      429,
      "TOO_MANY_FLOWS",
      "Ya hay autorizaciones pendientes. Esperá unos minutos antes de reintentar.",
    );
  }
  const flow = await prisma.mobileIntegrationFlow.create({
    data: {
      sessionId: session.id,
      purpose,
      stateHash: sha256Hex(state),
      codeChallenge,
      redirectUri,
      expiresAt: new Date(Date.now() + INTEGRATION_TTL_MS),
    },
  });
  return {
    flowId: flow.id,
    url: buildConsentUrl({
      clientId,
      redirectUri,
      state,
      ...(purpose === "gmail" ? { scope: GMAIL_SEND_SCOPE } : {}),
    }),
  };
}

/** El navegador nunca recibe tokens, secretos ni una sesión de genwork. */
export async function captureMobileIntegration(url: URL): Promise<string> {
  const result = new URL("genwork://integration");
  result.searchParams.set("error", "invalid");
  const state = url.searchParams.get("state");
  if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return result.toString();
  const flow = await prisma.mobileIntegrationFlow.findUnique({
    where: { stateHash: sha256Hex(state) },
    include: { session: { include: { user: true } } },
  });
  if (!flow || flow.usedAt || flow.expiresAt.getTime() <= Date.now()) return result.toString();
  result.searchParams.set("flowId", flow.id);
  if (flow.session.revokedAt || flow.session.user.globalRole !== "SUPERADMIN")
    return result.toString();
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error") || !code ? "authorization_failed" : null;
  const claimed = await prisma.mobileIntegrationFlow.updateMany({
    where: { id: flow.id, usedAt: null, codeEnc: null, error: null, expiresAt: { gt: new Date() } },
    data: { codeEnc: error ? null : encryptSecret(code!), error },
  });
  if (claimed.count === 1 && !error) result.searchParams.delete("error");
  return result.toString();
}

export async function finishMobileIntegration(
  authorization: string | null,
  flowId: string,
  verifier: string,
) {
  const session = await requireMobileAdmin(authorization);
  const flow = await prisma.mobileIntegrationFlow.findUnique({ where: { id: flowId } });
  if (
    !flow ||
    flow.sessionId !== session.id ||
    flow.usedAt ||
    flow.error ||
    !flow.codeEnc ||
    flow.expiresAt.getTime() <= Date.now() ||
    !verifyPkce(verifier, flow.codeChallenge)
  ) {
    throw badRequest(
      "La autorización expiró o no corresponde a este dispositivo. Volvé a conectar.",
    );
  }
  if (flow.purpose !== "drive" && flow.purpose !== "gmail")
    throw badRequest("Integración inválida");
  const auth = credentials(flow.purpose);
  const claimed = await prisma.mobileIntegrationFlow.updateMany({
    where: { id: flow.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date(), codeEnc: null },
  });
  if (claimed.count !== 1) throw badRequest("La autorización ya se utilizó");
  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    tokens = await exchangeCode({
      ...auth,
      code: decryptSecret(flow.codeEnc),
      redirectUri: flow.redirectUri,
    });
  } catch {
    throw new ApiError(
      502,
      "OAUTH_EXCHANGE_FAILED",
      "Google no pudo completar la conexión. Volvé a autorizar la cuenta.",
    );
  }
  await prisma.$transaction(async (tx) => {
    // Revalidar después del viaje a Google evita aplicar una sesión revocada.
    const active = await tx.mobileSession.findUnique({
      where: { id: session.id },
      include: { user: true },
    });
    if (!active || active.revokedAt || active.user.globalRole !== "SUPERADMIN") throw forbidden();
    if (flow.purpose === "gmail") {
      const gmail = {
        refreshToken: encryptSecret(tokens.refreshToken),
        ...(tokens.email ? { fromEmail: tokens.email } : {}),
      };
      const data = { reminderEmailConfig: { provider: "gmail", gmail } };
      await tx.accessConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    } else {
      const current = await tx.accessConfig.findUnique({ where: { id: 1 } });
      const prev = (current?.storageConfig as Record<string, string | null> | null) ?? {};
      const data = {
        storageProvider: "GDRIVE" as const,
        storageConfig: {
          ...prev,
          refreshTokenEnc: encryptSecret(tokens.refreshToken),
          ...(tokens.email ? { connectedEmail: tokens.email } : {}),
        },
      };
      await tx.accessConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    }
  });
}

export async function cancelMobileIntegration(authorization: string | null, flowId: string) {
  const session = await requireMobileAdmin(authorization);
  await prisma.mobileIntegrationFlow.deleteMany({
    where: { id: flowId, sessionId: session.id, usedAt: null },
  });
}
