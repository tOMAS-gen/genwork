/**
 * Tipos compartidos del sistema de registro de errores (feature 041).
 * Alineados con prisma/schema.prisma y specs/041-error-logging/contracts/admin-errors-api.md.
 */

export type ErrorLogStatus = "PENDING" | "RESOLVED";

/** Fila resumida del listado (GET /api/admin/errors) — sin `stack` ni `context`. */
export interface ErrorLogSummary {
  id: string;
  message: string;
  route: string;
  status: ErrorLogStatus;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Detalle completo (GET /api/admin/errors/[id]). */
export interface ErrorLogDetail extends ErrorLogSummary {
  stack: string | null;
  method: string | null;
  userId: string | null;
  context: Record<string, unknown> | null;
  resolvedAt: string | null;
}
