/**
 * Reglas de autorización de ingreso (FR-019/020) — funciones puras.
 */

export interface AccessRules {
  mode: "DOMAIN" | "LIST";
  domain: string | null;
  allowedEmails: ReadonlySet<string>;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** ¿Puede ingresar este correo? (el primer usuario del sistema siempre entra: bootstrap) */
export function isEmailAllowed(rules: AccessRules, email: string): boolean {
  const e = normalizeEmail(email);
  if (rules.mode === "DOMAIN") {
    if (!rules.domain) return false;
    const domain = rules.domain.trim().toLowerCase().replace(/^@/, "");
    return e.endsWith(`@${domain}`);
  }
  return rules.allowedEmails.has(e);
}

/**
 * ¿Puede volver a ingresar un usuario ya creado? El SUPERADMIN (evita quedarse sin
 * acceso al panel) y los CLIENT del portal (feature 059, se invitan por otra vía y
 * no están en la allowlist) siempre pasan; el resto sigue las reglas vigentes, de
 * modo que quitar un correo o cambiar el modo revoca el acceso en el próximo ingreso.
 */
export function canExistingUserSignIn(
  rules: AccessRules,
  user: { email: string; globalRole: string },
): boolean {
  if (user.globalRole === "SUPERADMIN" || user.globalRole === "CLIENT") return true;
  return isEmailAllowed(rules, user.email);
}
