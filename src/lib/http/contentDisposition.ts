/**
 * Arma el header `Content-Disposition` para un nombre de archivo cualquiera.
 *
 * Los headers HTTP solo admiten bytes latin-1: un nombre con caracteres fuera
 * de ese rango (p. ej. la tilde combinante U+0301 que deja macOS en "Diseño")
 * hace que `new Response()` lance "Cannot convert argument to a ByteString" y
 * la descarga responda 500. Va un `filename` ASCII de respaldo y el nombre real
 * en `filename*` codificado (RFC 6266 / RFC 5987), que usan todos los
 * navegadores actuales.
 */
export function contentDisposition(type: "attachment" | "inline", fileName: string): string {
  const name = fileName.normalize("NFC");
  const fallback =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_") || "archivo";
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
