/**
 * server/reminders.ts — acceso a datos + reglas de permiso de recordatorios (R7).
 * Reusa el patrón de ámbito ownerId/groupId y los guards existentes.
 */

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import type { UserContext } from "@/lib/domain/permissions";
import type { RecurrenceRule } from "@/lib/domain/reminders/types";
import type { Prisma, Reminder, ReminderLead } from "@prisma/client";

const leadSchema = z.object({
  daysBefore: z.number().int().min(0).max(3650),
  minuteOfDay: z.number().int().min(0).max(1439),
});

export const reminderInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullish(),
    scope: z.enum(["INDIVIDUAL", "GROUP", "GLOBAL"]),
    groupId: z.string().uuid().nullish(),
    date: z.string().datetime({ offset: true }).or(z.string().datetime()),
    recurrenceType: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "EVERY_N"]),
    weekdays: z.array(z.number().int().min(0).max(6)).optional().default([]),
    everyN: z.number().int().min(1).max(365).nullish(),
    everyUnit: z.enum(["DAY", "WEEK", "MONTH"]).nullish(),
    untilDate: z.string().datetime({ offset: true }).or(z.string().datetime()).nullish(),
    maxOccurrences: z.number().int().min(1).max(10000).nullish(),
    linkType: z.enum(["WORK", "SECTOR", "TASK"]).nullish(),
    linkId: z.string().uuid().nullish(),
    leads: z.array(leadSchema).min(1).max(20),
  })
  .superRefine((v, ctx) => {
    if (v.scope === "GROUP" && !v.groupId) {
      ctx.addIssue({ code: "custom", message: "Un recordatorio de grupo requiere groupId", path: ["groupId"] });
    }
    if (v.scope !== "GROUP" && v.groupId) {
      ctx.addIssue({ code: "custom", message: "Solo el alcance de grupo lleva groupId", path: ["groupId"] });
    }
    if (v.recurrenceType === "WEEKLY" && (!v.weekdays || v.weekdays.length === 0)) {
      ctx.addIssue({ code: "custom", message: "La recurrencia semanal requiere al menos un día", path: ["weekdays"] });
    }
    if (v.recurrenceType === "EVERY_N" && (!v.everyN || !v.everyUnit)) {
      ctx.addIssue({ code: "custom", message: "'Cada N' requiere intervalo y unidad", path: ["everyN"] });
    }
    if (v.untilDate && new Date(v.untilDate) < new Date(v.date)) {
      ctx.addIssue({ code: "custom", message: "El fin no puede ser anterior a la fecha", path: ["untilDate"] });
    }
    if ((v.linkType && !v.linkId) || (!v.linkType && v.linkId)) {
      ctx.addIssue({ code: "custom", message: "linkType y linkId van juntos", path: ["linkId"] });
    }
    // Antelaciones duplicadas
    const seen = new Set<string>();
    for (const l of v.leads) {
      const k = `${l.daysBefore}:${l.minuteOfDay}`;
      if (seen.has(k)) {
        ctx.addIssue({ code: "custom", message: "Hay antelaciones duplicadas", path: ["leads"] });
      }
      seen.add(k);
    }
  });

export type ReminderInputParsed = z.infer<typeof reminderInputSchema>;

/** Reminder → RecurrenceRule del dominio. */
export function toRecurrenceRule(r: Reminder): RecurrenceRule {
  return {
    date: r.date,
    recurrenceType: r.recurrenceType,
    weekdays: r.weekdays,
    everyN: r.everyN,
    everyUnit: r.everyUnit,
    untilDate: r.untilDate,
    maxOccurrences: r.maxOccurrences,
  };
}

/** ¿Puede el usuario crear un recordatorio con este alcance? */
async function assertCanCreate(
  ctx: UserContext,
  input: ReminderInputParsed,
): Promise<void> {
  if (input.scope === "GLOBAL") {
    if (ctx.globalRole !== "SUPERADMIN") throw forbidden("Solo el administrador crea recordatorios globales");
    return;
  }
  if (input.scope === "GROUP") {
    if (ctx.globalRole === "SUPERADMIN") return;
    if (!ctx.memberGroupIds.has(input.groupId!)) throw forbidden("No sos miembro de ese grupo");
    return;
  }
  // INDIVIDUAL: cualquier writer.
}

/** ¿Puede el usuario editar/borrar este recordatorio? */
export function canMutate(ctx: UserContext, r: Reminder): boolean {
  if (ctx.globalRole === "SUPERADMIN") return true;
  if (r.scope === "GLOBAL") return false; // solo superadmin
  if (r.scope === "INDIVIDUAL") return r.ownerId === ctx.id;
  if (r.scope === "GROUP") return r.groupId != null && ctx.memberGroupIds.has(r.groupId);
  return false;
}

function buildData(userId: string, input: ReminderInputParsed): Prisma.ReminderCreateInput {
  const base = {
    title: input.title,
    description: input.description ?? null,
    scope: input.scope,
    date: new Date(input.date),
    recurrenceType: input.recurrenceType,
    weekdays: input.recurrenceType === "WEEKLY" ? input.weekdays : [],
    everyN: input.recurrenceType === "EVERY_N" ? input.everyN ?? null : null,
    everyUnit: input.recurrenceType === "EVERY_N" ? input.everyUnit ?? null : null,
    untilDate: input.untilDate ? new Date(input.untilDate) : null,
    maxOccurrences: input.maxOccurrences ?? null,
    linkType: input.linkType ?? null,
    linkId: input.linkId ?? null,
    createdBy: { connect: { id: userId } },
  };
  return {
    ...base,
    ...(input.scope === "INDIVIDUAL" ? { owner: { connect: { id: userId } } } : {}),
    ...(input.scope === "GROUP" ? { group: { connect: { id: input.groupId! } } } : {}),
    leads: { create: input.leads.map((l) => ({ daysBefore: l.daysBefore, minuteOfDay: l.minuteOfDay })) },
  };
}

export async function createReminder(userId: string, input: ReminderInputParsed) {
  const ctx = await getUserContext(userId);
  await assertCanCreate(ctx, input);
  return prisma.reminder.create({ data: buildData(userId, input), include: { leads: true } });
}

export async function updateReminder(userId: string, id: string, input: ReminderInputParsed) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) throw notFound("Recordatorio no encontrado");
  if (!canMutate(ctx, existing)) throw forbidden();
  // El alcance no se cambia en edición (evita saltos de permiso); debe coincidir.
  if (input.scope !== existing.scope) throw badRequest("No se puede cambiar el alcance de un recordatorio");
  await assertCanCreate(ctx, input); // revalida groupId/permiso del alcance

  const [reminder] = await prisma.$transaction([
    prisma.reminder.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? null,
        date: new Date(input.date),
        recurrenceType: input.recurrenceType,
        weekdays: input.recurrenceType === "WEEKLY" ? input.weekdays : [],
        everyN: input.recurrenceType === "EVERY_N" ? input.everyN ?? null : null,
        everyUnit: input.recurrenceType === "EVERY_N" ? input.everyUnit ?? null : null,
        untilDate: input.untilDate ? new Date(input.untilDate) : null,
        maxOccurrences: input.maxOccurrences ?? null,
        linkType: input.linkType ?? null,
        linkId: input.linkId ?? null,
        // Reemplaza las antelaciones por completo.
        leads: {
          deleteMany: {},
          create: input.leads.map((l) => ({ daysBefore: l.daysBefore, minuteOfDay: l.minuteOfDay })),
        },
      },
      include: { leads: true },
    }),
    // FR-006a: regenerar disparos futuros aún no enviados ni interactuados.
    prisma.reminderDelivery.deleteMany({
      where: { reminderId: id, emailStatus: "PENDING", status: "PENDING", firedAt: { gt: new Date() } },
    }),
  ]);
  return reminder;
}

export async function deleteReminder(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) throw notFound("Recordatorio no encontrado");
  if (!canMutate(ctx, existing)) throw forbidden();
  await prisma.reminder.delete({ where: { id } });
}

/** Recordatorios visibles para un usuario (individuales propios + grupos + globales). */
export async function getVisibleReminders(
  userId: string,
): Promise<(Reminder & { leads: ReminderLead[] })[]> {
  const ctx = await getUserContext(userId);
  return prisma.reminder.findMany({
    where: {
      OR: [
        { scope: "GLOBAL" },
        { scope: "INDIVIDUAL", ownerId: userId },
        { scope: "GROUP", groupId: { in: [...ctx.memberGroupIds] } },
      ],
    },
    include: { leads: true },
    orderBy: { date: "asc" },
  });
}

export async function getReminderForUser(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const r = await prisma.reminder.findUnique({ where: { id }, include: { leads: true } });
  if (!r) throw notFound("Recordatorio no encontrado");
  const visible =
    r.scope === "GLOBAL" ||
    (r.scope === "INDIVIDUAL" && r.ownerId === userId) ||
    (r.scope === "GROUP" && r.groupId != null && ctx.memberGroupIds.has(r.groupId)) ||
    ctx.globalRole === "SUPERADMIN";
  if (!visible) throw notFound("Recordatorio no encontrado");
  return { reminder: r, canMutate: canMutate(ctx, r) };
}
