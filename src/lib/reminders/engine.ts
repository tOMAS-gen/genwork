/**
 * engine.ts — motor de disparo de recordatorios (research R1/R2/R8).
 *
 * Cada tick: por cada recordatorio, calcula las ocurrencias en una ventana
 * reciente y, por cada antelación, el instante de disparo; para los que vencen
 * (y aún no se enviaron) hace fan-out de ReminderDelivery por usuario según el
 * alcance (idempotente vía unique key) y despacha el email. Un fallo de email
 * nunca revierte la delivery in-app (FR-021).
 */

import { prisma } from "@/lib/db/client";
import { getSystemTimezone, formatInTz } from "@/lib/time/system-tz";
import { occurrencesBetween, toCalDate } from "@/lib/domain/reminders/recurrence";
import { fireInstant } from "@/lib/domain/reminders/leads";
import { resolveRecipients } from "@/lib/domain/reminders/recipients";
import { toRecurrenceRule } from "@/server/reminders";
import { sendReminderEmail } from "./email/send";
import { renderReminderEmail } from "./email/template";
import { resolveReminderLink, appBaseUrl } from "./link";

const DAY_MS = 86_400_000;
const CATCHUP_DAYS = 2; // reprocesa disparos perdidos si el ticker estuvo caído

let processing = false;

/** Un tick completo del motor. Idempotente y con un solo worker por proceso. */
export async function tick(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    await fanOut();
    await dispatchEmails();
  } catch (err) {
    console.error("[reminders] tick error:", err);
  } finally {
    processing = false;
  }
}

/** Materializa las ReminderDelivery vencidas (aviso in-app). */
async function fanOut(): Promise<void> {
  const now = new Date();
  const tz = await getSystemTimezone();

  const reminders = await prisma.reminder.findMany({ include: { leads: true } });
  if (reminders.length === 0) return;

  // Cache de destinatarios por tick.
  let allUserIdsCache: string[] | null = null;
  const groupMembersCache = new Map<string, string[]>();

  const rows: {
    reminderId: string;
    leadId: string;
    userId: string;
    occurrenceDate: Date;
    firedAt: Date;
  }[] = [];

  for (const r of reminders) {
    if (r.leads.length === 0) continue;
    const maxDaysBefore = Math.max(...r.leads.map((l) => l.daysBefore));

    const rangeStart = new Date(toCalDate(now).getTime() - CATCHUP_DAYS * DAY_MS);
    const rangeEnd = new Date(toCalDate(now).getTime() + (maxDaysBefore + 1) * DAY_MS);
    const occurrences = occurrencesBetween(toRecurrenceRule(r), rangeStart, rangeEnd);
    if (occurrences.length === 0) continue;

    // Destinatarios (al momento del disparo, FR-023).
    let recipients: string[];
    if (r.scope === "INDIVIDUAL") {
      recipients = resolveRecipients("INDIVIDUAL", { ownerId: r.ownerId, groupMemberIds: [], allUserIds: [] });
    } else if (r.scope === "GROUP" && r.groupId) {
      let members = groupMembersCache.get(r.groupId);
      if (!members) {
        const memberRows = await prisma.groupMembership.findMany({ where: { groupId: r.groupId }, select: { userId: true } });
        members = memberRows.map((m) => m.userId);
        groupMembersCache.set(r.groupId, members);
      }
      recipients = resolveRecipients("GROUP", { ownerId: null, groupMemberIds: members, allUserIds: [] });
    } else if (r.scope === "GLOBAL") {
      if (!allUserIdsCache) {
        const users = await prisma.user.findMany({ select: { id: true } });
        allUserIdsCache = users.map((u) => u.id);
      }
      recipients = resolveRecipients("GLOBAL", { ownerId: null, groupMemberIds: [], allUserIds: allUserIdsCache });
    } else {
      continue;
    }
    if (recipients.length === 0) continue;

    for (const occ of occurrences) {
      for (const lead of r.leads) {
        const fire = fireInstant(occ, lead, tz);
        if (fire > now) continue; // aún no vence
        if (fire.getTime() < now.getTime() - CATCHUP_DAYS * DAY_MS) continue; // demasiado viejo
        for (const userId of recipients) {
          rows.push({ reminderId: r.id, leadId: lead.id, userId, occurrenceDate: occ, firedAt: fire });
        }
      }
    }
  }

  if (rows.length > 0) {
    // Idempotente: el unique (reminderId, leadId, occurrenceDate, userId) descarta repetidos.
    await prisma.reminderDelivery.createMany({ data: rows, skipDuplicates: true });
  }
}

/** Envía el email de las deliveries con emailStatus=PENDING. */
async function dispatchEmails(): Promise<void> {
  const tz = await getSystemTimezone();
  const pending = await prisma.reminderDelivery.findMany({
    where: { emailStatus: "PENDING" },
    include: { reminder: true, user: { select: { email: true } } },
    take: 200,
  });

  for (const d of pending) {
    const link = await resolveReminderLink(d.reminder.linkType, d.reminder.linkId);
    const linkUrl = link?.available && link.path ? `${appBaseUrl()}${link.path}` : null;
    const { subject, html } = renderReminderEmail({
      title: d.reminder.title,
      description: d.reminder.description,
      dateLabel: formatInTz(d.firedAt, tz),
      timezoneLabel: tz,
      linkUrl,
      linkLabel: link?.label,
    });

    const result = await sendReminderEmail({ to: d.user.email, subject, html });
    await prisma.reminderDelivery.update({
      where: { id: d.id },
      data: {
        emailStatus: result.status,
        emailError: result.status === "FAILED" ? result.error : null,
      },
    });
  }
}
