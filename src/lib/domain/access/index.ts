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
