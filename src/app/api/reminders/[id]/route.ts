import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { requireWriter } from "@/server/guards";
import { deleteReminder, getReminderForUser, reminderInputSchema, updateReminder } from "@/server/reminders";

/** GET /api/reminders/[id] — detalle (si es visible para el usuario). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const { reminder, canMutate } = await getReminderForUser(session.user.id, id);
  return NextResponse.json({ reminder, canMutate });
});

/** PATCH /api/reminders/[id] — editar (permiso según alcance); regenera disparos futuros. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const input = reminderInputSchema.parse(await req.json());
  const reminder = await updateReminder(session.user.id, id, input);
  return NextResponse.json({ reminder });
});

/** DELETE /api/reminders/[id] — borrar (permiso según alcance). */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await deleteReminder(session.user.id, id);
  return new NextResponse(null, { status: 204 });
});
