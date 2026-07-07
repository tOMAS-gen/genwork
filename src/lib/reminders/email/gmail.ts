/**
 * gmail.ts — envío de email vía Gmail REST API (research R5). `fetch` nativo,
 * reusa el OAuth de Google (`getAccessToken`). El refresh token de email se guarda
 * cifrado en AccessConfig.reminderEmailConfig.
 */

import { getAccessToken } from "@/lib/storage/google-auth";
import { decryptSecret } from "@/lib/crypto";

export interface GmailConfig {
  refreshToken: string; // cifrado (encryptSecret)
  fromEmail?: string;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMime(input: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): string {
  // Subject codificado en RFC 2047 (UTF-8) para acentos/emoji.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(input.subject, "utf8").toString("base64")}?=`;
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.html,
  ].join("\r\n");
}

/** Envía un email por Gmail. Lanza en caso de error (lo captura `send.ts`). */
export async function sendViaGmail(
  msg: { to: string; subject: string; html: string },
  config: GmailConfig,
): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET para enviar email");
  }

  const accessToken = await getAccessToken({
    clientId,
    clientSecret,
    refreshToken: decryptSecret(config.refreshToken),
  });

  const raw = base64url(
    buildMime({
      to: msg.to,
      from: config.fromEmail || "me",
      subject: msg.subject,
      html: msg.html,
    }),
  );

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gmail rechazó el envío (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }
}
