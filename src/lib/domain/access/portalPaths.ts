/**
 * Feature 059 — qué direcciones puede alcanzar una cuenta de cliente externo.
 *
 * Función pura, sin I/O, para poder testearla sin montar el middleware.
 *
 * Es la única lista explícita de todo el diseño: el resto de la superficie se
 * cierra por deny-by-default (guards con allowlist de roles y motor de permisos).
 * Mantenerla corta es parte del punto — si crece, algo se está haciendo mal.
 */
const CLIENT_ALLOWED_PREFIXES: readonly string[] = [
  "/portal",
  "/api/portal",
  "/api/auth", // inicio y cierre de sesión
  "/api/me", // datos de la propia cuenta
  "/login",
];

/**
 * Coincidencia por segmento, no por prefijo de texto: `/api/portalish` NO puede
 * colar como `/api/portal`.
 */
function matchesSegment(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** ¿Una cuenta de cliente puede alcanzar esta dirección? (FR-014) */
export function isPathAllowedForClient(pathname: string): boolean {
  return CLIENT_ALLOWED_PREFIXES.some((base) => matchesSegment(pathname, base));
}
