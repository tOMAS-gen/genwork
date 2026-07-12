import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { fingerprint } from "@/lib/errors/fingerprint";

interface UpsertArgsInput {
  fingerprint: string;
  message: string;
  stack: string | null;
  route: string;
  method: string | null;
  userId: string | null;
  data: Record<string, unknown> | undefined;
  now: Date;
}

/**
 * Arma los argumentos de `prisma.errorLog.upsert()`. El `update` es incondicional
 * por diseño (ver data-model.md § Nota de implementación): repetir sobre un error
 * PENDING lo deja igual; repetir sobre uno RESOLVED lo reabre (FR-011). No lee el
 * estado previo — así el upsert queda atómico (research.md §2).
 */
export function buildErrorLogUpsertArgs(input: UpsertArgsInput) {
  return {
    where: { fingerprint: input.fingerprint },
    create: {
      fingerprint: input.fingerprint,
      message: input.message,
      stack: input.stack,
      route: input.route,
      method: input.method,
      userId: input.userId,
      context: (input.data as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
      status: "PENDING" as const,
      occurrences: 1,
      firstSeenAt: input.now,
      lastSeenAt: input.now,
    },
    update: {
      occurrences: { increment: 1 },
      lastSeenAt: input.now,
      status: "PENDING" as const,
      resolvedAt: null,
      ...(input.userId ? { userId: input.userId } : {}),
    },
  };
}

/**
 * Captura best-effort de un error no controlado (FR-001, FR-010): nunca relanza,
 * nunca captura el body/payload de la request (FR-002, FR-009).
 */
export async function logError(
  err: unknown,
  context: { route: string; method?: string; userId?: string | null; data?: Record<string, unknown> },
): Promise<void> {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    const args = buildErrorLogUpsertArgs({
      fingerprint: fingerprint(message, context.route),
      message,
      stack,
      route: context.route,
      method: context.method ?? null,
      userId: context.userId ?? null,
      data: context.data,
      now: new Date(),
    });
    await prisma.errorLog.upsert(args);
  } catch (loggingError) {
    console.error("logError: fallo al registrar el error original:", loggingError);
  }
}
