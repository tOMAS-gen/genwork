import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma/verifica el `state` del OAuth incremental de Google Drive por usuario
 * (feature 051, T008). Es un HMAC-SHA256 sobre `{ userId, ts }` con `AUTH_SECRET`,
 * para atar el callback al usuario que inició el flujo sin depender de una cookie.
 * Formato: `<payloadB64url>.<sigB64url>`.
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Falta AUTH_SECRET para firmar el state OAuth");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signLinkState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Devuelve el userId si el state es válido y no expiró; null en cualquier otro caso. */
export function verifyLinkState(state: string | null): string | null {
  if (!state) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { userId, ts } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: string;
      ts?: number;
    };
    if (!userId || typeof ts !== "number" || Date.now() - ts > STATE_TTL_MS) return null;
    return userId;
  } catch {
    return null;
  }
}
