/**
 * send.ts — interfaz única de envío de email de recordatorios (research R5).
 * Selecciona el proveedor según AccessConfig.reminderEmailConfig y NUNCA lanza
 * hacia el engine: devuelve un resultado tipado (FR-021).
 */

import { prisma } from "@/lib/db/client";
import { sendViaGmail, type GmailConfig } from "./gmail";

export type SendResult =
  | { status: "SENT" }
  | { status: "FAILED"; error: string }
  | { status: "SKIPPED"; reason: string };

interface EmailConfig {
  provider?: "gmail" | "smtp";
  gmail?: GmailConfig;
}

/** Envía un email; devuelve SENT/FAILED/SKIPPED sin lanzar. */
export async function sendReminderEmail(msg: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!msg.to) return { status: "SKIPPED", reason: "destinatario sin email" };

  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const email = (config?.reminderEmailConfig as EmailConfig | null) ?? null;

  if (!email?.provider) {
    return { status: "SKIPPED", reason: "email no configurado" };
  }

  try {
    if (email.provider === "gmail") {
      if (!email.gmail?.refreshToken) {
        return { status: "SKIPPED", reason: "Gmail sin refresh token" };
      }
      await sendViaGmail(msg, email.gmail);
      return { status: "SENT" };
    }
    // Plan B (SMTP) diferido: interfaz lista, implementación aparte.
    return { status: "SKIPPED", reason: `proveedor ${email.provider} no implementado` };
  } catch (err) {
    return { status: "FAILED", error: (err as Error).message };
  }
}
