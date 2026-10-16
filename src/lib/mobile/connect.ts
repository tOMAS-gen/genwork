/**
 * Vínculo de la app móvil por QR: el QR lleva solo la dirección pública del
 * servidor (nunca credenciales). La app lo escanea, valida la dirección contra
 * /api/auth/mobile/info y recién después pide el login.
 */

const CONNECT_BASE = "genwork://connect";

/** Payload del QR: `genwork://connect?server=<origen>`. Solo la dirección. */
export function buildConnectPayload(origin: string): string {
  const params = new URLSearchParams({ server: origin });
  return `${CONNECT_BASE}?${params.toString()}`;
}

/** Nombre visible del sistema: `SYSTEM_NAME` o, si falta, el host público. */
export function systemName(baseUrl: string, envName: string | undefined): string {
  const fromEnv = envName?.trim();
  if (fromEnv) return fromEnv;
  return new URL(baseUrl).host;
}

/** True si el origen apunta a la propia máquina: un teléfono no podría usarlo. */
export function isLocalOrigin(origin: string): boolean {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}
