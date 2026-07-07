import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getSystemTimezone, zonedTimeToUtc, calDateInTz } from "@/lib/time/system-tz";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("DISMISS") }),
  z.object({ action: z.literal("SNOOZE"), preset: z.enum(["1h", "tomorrow"]) }),
]);

/**
 * PATCH /api/reminders/deliveries/[id] — descartar o posponer un aviso (FR-016/017).
 * Individual por usuario: no afecta a otros destinatarios (FR-018).
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = actionSchema.parse(await req.json());

  const delivery = await prisma.reminderDelivery.findUnique({ where: { id } });
  if (!delivery) throw notFound("Aviso no encontrado");
  if (delivery.userId !== session.user.id) throw forbidden();

  if (body.action === "DISMISS") {
    const updated = await prisma.reminderDelivery.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
    return NextResponse.json({ delivery: updated });
  }

  // SNOOZE
  const now = new Date();
  let snoozedUntil: Date;
  if (body.preset === "1h") {
    snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000);
  } else {
    // mañana 09:00 en la zona del sistema
    const tz = await getSystemTimezone();
    const today = calDateInTz(now, tz);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    snoozedUntil = zonedTimeToUtc(
      {
        year: tomorrow.getUTCFullYear(),
        month: tomorrow.getUTCMonth() + 1,
        day: tomorrow.getUTCDate(),
        hour: 9,
        minute: 0,
      },
      tz,
    );
  }

  const updated = await prisma.reminderDelivery.update({
    where: { id },
    data: { status: "SNOOZED", snoozedUntil },
  });
  return NextResponse.json({ delivery: updated });
});
