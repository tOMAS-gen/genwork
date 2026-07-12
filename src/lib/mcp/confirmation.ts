import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

const TTL_MS = 5 * 60 * 1000;

export interface PendingConfirmation {
  confirmationToken: string;
  summary: string;
  expiresAt: string;
}

export class ConfirmationError extends Error {
  constructor(message = "La confirmación no existe, ya se usó, venció o es de otra conexión") {
    super(message);
    this.name = "ConfirmationError";
  }
}

/**
 * Crea un pedido pendiente de confirmación de dos pasos (FR-012). El `payload` ya
 * validado se persiste tal cual y se reejecuta sin volver a confiar en el input
 * del segundo llamado a la herramienta.
 */
export async function createConfirmation(
  connectionId: string,
  kind: string,
  payload: Prisma.InputJsonValue,
  summary: string,
): Promise<PendingConfirmation> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const confirmation = await prisma.mcpConfirmation.create({
    data: { connectionId, kind, payload, summary, expiresAt },
  });
  return {
    confirmationToken: confirmation.id,
    summary,
    expiresAt: expiresAt.toISOString(),
  };
}

type ConfirmationRecord = {
  connectionId: string;
  kind: string;
  consumedAt: Date | null;
  expiresAt: Date;
};

/** Decisión pura: si esta confirmación puede consumirse ahora mismo. */
export function isConfirmationUsable(
  confirmation: ConfirmationRecord | null,
  connectionId: string,
  kind: string,
  now: Date,
): confirmation is ConfirmationRecord {
  if (!confirmation) return false;
  if (confirmation.connectionId !== connectionId) return false;
  if (confirmation.kind !== kind) return false;
  if (confirmation.consumedAt !== null) return false;
  if (confirmation.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Consume una confirmación pendiente y devuelve el `payload` original validado
 * en el primer llamado. Lanza `ConfirmationError` si no es válida (FR-012).
 */
export async function consumeConfirmation<TPayload = unknown>(
  confirmationToken: string,
  connectionId: string,
  kind: string,
): Promise<TPayload> {
  const confirmation = await prisma.mcpConfirmation.findUnique({
    where: { id: confirmationToken },
  });
  if (!isConfirmationUsable(confirmation, connectionId, kind, new Date())) {
    throw new ConfirmationError();
  }
  await prisma.mcpConfirmation.update({
    where: { id: confirmationToken },
    data: { consumedAt: new Date() },
  });
  return confirmation.payload as TPayload;
}
