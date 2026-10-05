/**
 * URL de Nextcloud para el navegador. `NEXTCLOUD_URL` suele ser la dirección
 * interna de Docker (p. ej. `http://nextcloud_gen_app`), que sirve para que la
 * app le hable a Nextcloud pero no para un link que abre el usuario.
 * Prioridad: `NEXTCLOUD_PUBLIC_URL` → `https://${NEXTCLOUD_HOST}` → la URL de
 * conexión (panel admin o `NEXTCLOUD_URL`).
 */
export function nextcloudPublicUrl(
  connectionUrl: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.NEXTCLOUD_PUBLIC_URL || (env.NEXTCLOUD_HOST ? `https://${env.NEXTCLOUD_HOST}` : connectionUrl);
  return url.replace(/\/+$/, "");
}
