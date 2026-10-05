/**
 * Tope por archivo para subir al visor. Debe coincidir con los límites de la
 * cadena: `proxyClientMaxBodySize` (next.config.ts) y `client_max_body_size`
 * del nginx/Caddy delante de la app.
 */
export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
