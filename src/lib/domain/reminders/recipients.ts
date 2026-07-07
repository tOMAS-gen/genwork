/**
 * recipients.ts — resolución pura de destinatarios por alcance (research R8).
 * Los datos (owner, miembros del grupo, todos los usuarios) los provee el engine
 * al momento del disparo (FR-023); esta función solo decide a quién le toca.
 */

import type { ReminderScope } from "./types";

export interface RecipientDeps {
  /** Owner del recordatorio (INDIVIDUAL). */
  ownerId: string | null;
  /** Miembros vigentes del grupo al momento del disparo (GROUP). */
  groupMemberIds: readonly string[];
  /** Todos los usuarios del sistema (GLOBAL). */
  allUserIds: readonly string[];
}

/** Devuelve los userIds destinatarios (sin duplicados) según el alcance. */
export function resolveRecipients(scope: ReminderScope, deps: RecipientDeps): string[] {
  switch (scope) {
    case "INDIVIDUAL":
      return deps.ownerId ? [deps.ownerId] : [];
    case "GROUP":
      return [...new Set(deps.groupMemberIds)];
    case "GLOBAL":
      return [...new Set(deps.allUserIds)];
    default:
      return [];
  }
}
