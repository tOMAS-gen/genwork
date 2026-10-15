import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import type { GlobalRole } from "@prisma/client";

/**
 * Feature 064 — autenticación de la app móvil.
 *
 * Flujo: la app abre `/api/auth/mobile/start` en el navegador del sistema con un
 * `code_challenge` PKCE (S256). Si no hay sesión web, se pasa por el login normal
 * (Google + allowlist, sin client IDs nuevos). Con sesión, se emite un código de un
 * solo uso y se redirige a `genwork://auth?code=…`. La app canjea el código + el
 * `code_verifier` en `/api/auth/mobile/token` y recibe un token Bearer de larga
 * vida. Igual que el token MCP, solo se persiste su hash.
 */

export const MOBILE_TOKEN_PREFIX = "genwork_mob_";
export const MOBILE_CALLBACK_URL = "genwork://auth";
export const AUTH_CODE_TTL_MS = 2 * 60_000;

/** Identidad que la app recibe al loguear y que `requireSession` reconstruye. */
export interface MobileUser {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  image: string | null;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateMobileToken(): string {
  return `${MOBILE_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function generateAuthCode(): string {
  return randomBytes(32).toString("base64url");
}

/** `BASE64URL(SHA256(verifier))` — método S256 de RFC 7636. */
export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Un challenge S256 son siempre 43 caracteres base64url (32 bytes sin padding). */
export function isValidCodeChallenge(challenge: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(challenge);
}

/** RFC 7636: el verifier tiene entre 43 y 128 caracteres no reservados. */
export function isValidCodeVerifier(verifier: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(verifier);
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!isValidCodeVerifier(verifier)) return false;
  const expected = Buffer.from(pkceChallengeS256(verifier));
  const actual = Buffer.from(challenge);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Todos los roles conocidos pueden iniciar sesión. El rol actual sigue
 * autorizándose en cada recurso; un token móvil nunca concede permisos propios.
 */
export function canUseMobileApp(role: GlobalRole): boolean {
  return ["SUPERADMIN", "MEMBER", "CLIENT", "READER"].includes(role);
}

/** Devuelve el token si el header es `Bearer genwork_mob_…`, si no null. */
export function extractMobileToken(authorization: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec((authorization ?? "").trim());
  const token = match?.[1];
  return token && token.startsWith(MOBILE_TOKEN_PREFIX) ? token : null;
}

/** Callback de la app con los parámetros dados (siempre devuelve `state`). */
export function mobileCallbackUrl(params: Record<string, string>): string {
  return `${MOBILE_CALLBACK_URL}?${new URLSearchParams(params).toString()}`;
}

export async function issueAuthCode(userId: string, codeChallenge: string): Promise<string> {
  const code = generateAuthCode();
  await prisma.mobileAuthCode.create({
    data: {
      userId,
      codeHash: sha256Hex(code),
      codeChallenge,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Canjea un código por un token. Devuelve null ante cualquier falla (código
 * inexistente, vencido, ya usado, verifier incorrecto o rol sin acceso) sin
 * distinguir el motivo. El `updateMany` condicionado hace el uso único atómico.
 */
export async function redeemAuthCode(
  code: string,
  codeVerifier: string,
  deviceName: string,
): Promise<{ token: string; user: MobileUser } | null> {
  const record = await prisma.mobileAuthCode.findUnique({
    where: { codeHash: sha256Hex(code) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
  if (!verifyPkce(codeVerifier, record.codeChallenge)) return null;
  if (!canUseMobileApp(record.user.globalRole)) return null;

  const claimed = await prisma.mobileAuthCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  const token = generateMobileToken();
  await prisma.mobileSession.create({
    data: { userId: record.userId, deviceName, tokenHash: sha256Hex(token) },
  });
  return { token, user: toMobileUser(record.user) };
}

/** Usuario detrás de un token móvil vigente, o null si no existe/revocado/sin acceso. */
export async function userFromMobileToken(token: string): Promise<MobileUser | null> {
  const session = await prisma.mobileSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt) return null;
  if (!canUseMobileApp(session.user.globalRole)) return null;

  // Best-effort: no bloquea el request si falla.
  void prisma.mobileSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return toMobileUser(session.user);
}

export async function revokeMobileToken(token: string): Promise<void> {
  await prisma.mobileSession.updateMany({
    where: { tokenHash: sha256Hex(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function toMobileUser(user: {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  image: string | null;
}): MobileUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    globalRole: user.globalRole,
    image: user.image,
  };
}
