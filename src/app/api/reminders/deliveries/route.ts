import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { resolveReminderLink } from "@/lib/reminders/link";

/**
 * GET /api/reminders/deliveries — "lo que vence hoy" del usuario (FR-015).
 * Deliveries no descartadas, ya disparadas, y con snooze vencido o sin snooze.
 */
export const GET = withApi(async () => {
  const session = await requireSession();
  const now = new Date();

  const deliveries = await prisma.reminderDelivery.findMany({
    where: {
      userId: session.user.id,
      status: { not: "DISMISSED" },
      firedAt: { lte: now },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    include: { reminder: true },
    orderBy: { firedAt: "desc" },
    take: 100,
  });

  const items = await Promise.all(
    deliveries.map(async (d) => {
      const link = await resolveReminderLink(d.reminder.linkType, d.reminder.linkId);
      return {
        id: d.id,
        reminderId: d.reminderId,
        title: d.reminder.title,
        description: d.reminder.description,
        occurrenceDate: d.occurrenceDate.toISOString(),
        firedAt: d.firedAt.toISOString(),
        linkType: d.reminder.linkType,
        linkPath: link?.available ? link.path : null,
        linkLabel: link?.label ?? null,
        linkAvailable: link?.available ?? false,
      };
    }),
  );

  return NextResponse.json({ deliveries: items });
});
