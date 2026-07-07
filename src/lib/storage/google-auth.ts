/**
 * google-auth.ts — helpers OAuth de Google para Drive (research R2/R3).
 *
 * Todo con `fetch` nativo (Node 20), sin dependencias npm nuevas. Cubre:
 *   - getAccessToken: refresh token → access token (cacheado en memoria).
 *   - buildConsentUrl: arma la URL de consentimiento (scope drive, offline+consent).
 *   - exchangeCode: authorization code → refresh + access token (+ email opcional).
 *
 * El refresh token del admin se guarda cifrado en `AccessConfig.storageConfig`
 * (ver `@/lib/crypto`). Estos helpers solo hablan con los endpoints REST de Google.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
/** Scope para enviar email de recordatorios vía Gmail API (feature 036, R5). */
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

/** Margen de seguridad: renovar el access token 60s antes de que expire. */
const EXPIRY_MARGIN_MS = 60_000;

/** Cache de access tokens en memoria del módulo, indexado por refresh token. */
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

/**
 * Obtiene un access token fresco a partir del refresh token del admin.
 * Cachea el token en memoria por `refreshToken` hasta ~60s antes de su expiración
 * para evitar golpear el endpoint de Google en cada operación de Drive.
 *
 * @throws Error si Google rechaza el refresh token (ej. `invalid_grant` = revocado).
 */
export async function getAccessToken(cfg: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const cached = tokenCache.get(cfg.refreshToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    const err = data?.error ?? `HTTP ${res.status}`;
    if (data?.error === "invalid_grant") {
      throw new Error(
        "Google rechazó el refresh token (invalid_grant): el permiso fue revocado o expiró. Reconectá Google Drive desde el panel de almacenamiento.",
      );
    }
    throw new Error(
      `No se pudo obtener el access token de Google (${err}${data?.error_description ? `: ${data.error_description}` : ""})`,
    );
  }

  const expiresInMs = (data.expires_in ?? 3600) * 1000;
  tokenCache.set(cfg.refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresInMs - EXPIRY_MARGIN_MS,
  });

  return data.access_token;
}

/**
 * Arma la URL de consentimiento de Google para el flujo OAuth del admin.
 * Pide el scope Drive con acceso offline (para recibir refresh token) y fuerza
 * `prompt=consent` para asegurar que Google devuelva el refresh token.
 */
export function buildConsentUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  /** Scope(s) a pedir. Default: Drive (preserva el comportamiento existente). */
  scope?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: input.scope ?? DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Intercambia el authorization code (recibido en el callback) por tokens.
 * Devuelve el refresh token (a cifrar y guardar), el access token, y el email
 * del admin si Google incluyó un `id_token` (se decodifica el payload JWT SIN
 * verificar firma — solo para mostrar en el panel).
 *
 * @throws Error si Google no devuelve refresh token (falta re-consentir con prompt=consent).
 */
export async function exchangeCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ refreshToken: string; accessToken: string; email?: string }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    const err = data?.error ?? `HTTP ${res.status}`;
    throw new Error(
      `No se pudo intercambiar el código de Google (${err}${data?.error_description ? `: ${data.error_description}` : ""})`,
    );
  }

  if (!data.refresh_token) {
    throw new Error(
      "Google no devolvió un refresh token. Reintentá la conexión: es necesario re-consentir el acceso (prompt=consent) para obtenerlo.",
    );
  }

  const email = data.id_token ? decodeIdTokenEmail(data.id_token) : undefined;

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    email,
  };
}

/**
 * Decodifica el payload de un id_token JWT SIN verificar la firma (solo para
 * mostrar el email del admin conectado). Devuelve undefined si no se puede leer.
 */
function decodeIdTokenEmail(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { email?: string };
    return typeof claims.email === "string" ? claims.email : undefined;
  } catch {
    return undefined;
  }
}
