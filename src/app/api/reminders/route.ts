import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { requireWriter } from "@/server/guards";
import { createReminder, getVisibleReminders, reminderInputSchema, toRecurrenceRule } from "@/server/reminders";
import { occurrencesBetween, toCalDate } from "@/lib/domain/reminders/recurrence";

/**
 * POST /api/reminders — crea un recordatorio (FR-001..005). El alcance decide el
 * permiso (individual: writer; grupo: miembro; global: superadmin).
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const input = reminderInputSchema.parse(await req.json());
  const reminder = await createReminder(session.user.id, input);
  return NextResponse.json({ reminder }, { status: 201 });
});

/**
 * GET /api/reminders?from=&to= — recordatorios visibles + ocurrencias en el rango
 * para pintar el calendario (FR-013).
 */
export const GET = withApi(async (req) => {
  const session = await requireSession();
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const reminders = await getVisibleReminders(session.user.id);

  let occurrences: { reminderId: string; date: string; title: string; scope: string }[] = [];
  if (fromParam && toParam) {
    const from = toCalDate(new Date(fromParam));
    const to = toCalDate(new Date(toParam));
    occurrences = reminders.flatMap((r) =>
      occurrencesBetween(toRecurrenceRule(r), from, to).map((d) => ({
        reminderId: r.id,
        date: d.toISOString(),
        title: r.title,
        scope: r.scope,
      })),
    );
  }

  return NextResponse.json({ reminders, occurrences });
});
