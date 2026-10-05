/**
 * `Content-Disposition` válido para cualquier nombre: los headers solo admiten
 * bytes (un "—" o un emoji hacen fallar la respuesta), así que va un `filename`
 * ASCII de respaldo y el nombre real en UTF-8 por `filename*` (RFC 6266).
 */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "_") || "archivo";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(fileName)}`;
}

/** `encodeURIComponent` deja pasar `'()*`, que `filename*` no admite. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
