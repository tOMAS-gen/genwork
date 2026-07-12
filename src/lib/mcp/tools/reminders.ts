import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { forbidden, notFound } from "@/server/api";
import {
  createReminder,
  deleteReminder,
  getVisibleReminders,
  reminderInputSchema,
  canMutate,
} from "@/server/reminders";
import { getUserContext } from "@/server/user-context";
import { prisma } from "@/lib/db/client";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

const DEFAULT_LEAD = { daysBefore: 0, minuteOfDay: 9 * 60 };

export function registerReminderTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "reminder.list",
    {
      title: "Listar recordatorios",
      description: "Lista los recordatorios visibles para el usuario (individuales, de sus grupos y globales).",
      inputSchema: {
        scope: z.enum(["INDIVIDUAL", "GROUP", "GLOBAL"]).optional(),
        workId: z.string().uuid().optional(),
      },
    },
    async ({ scope, workId }) => {
      try {
        let reminders = await getVisibleReminders(ctx.userId);
        if (scope) reminders = reminders.filter((r) => r.scope === scope);
        if (workId) reminders = reminders.filter((r) => r.linkType === "WORK" && r.linkId === workId);
        return toolSuccess(`${reminders.length} recordatorio(s).`, {
          reminders: reminders.map((r) => ({
            id: r.id,
            title: r.title,
            scope: r.scope,
            date: r.date,
            recurrenceType: r.recurrenceType,
            linkType: r.linkType,
            linkId: r.linkId,
          })),
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "reminder.create",
    {
      title: "Crear recordatorio",
      description:
        "Crea un recordatorio. Sin leads, avisa el mismo día a las 9:00. Sin recurrenceType, es un aviso único.",
      inputSchema: {
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        scope: z.enum(["INDIVIDUAL", "GROUP", "GLOBAL"]),
        groupId: z.string().uuid().optional(),
        date: z.string().datetime({ offset: true }).or(z.string().datetime()),
        recurrenceType: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "EVERY_N"]).optional(),
        weekdays: z.array(z.number().int().min(0).max(6)).optional(),
        everyN: z.number().int().min(1).max(365).optional(),
        everyUnit: z.enum(["DAY", "WEEK", "MONTH"]).optional(),
        untilDate: z.string().optional(),
        maxOccurrences: z.number().int().min(1).max(10000).optional(),
        linkType: z.enum(["WORK", "SECTOR", "TASK"]).optional(),
        linkId: z.string().uuid().optional(),
        leads: z
          .array(z.object({ daysBefore: z.number().int().min(0).max(3650), minuteOfDay: z.number().int().min(0).max(1439) }))
          .optional(),
      },
    },
    async (input) => {
      try {
        const parsed = reminderInputSchema.parse({
          ...input,
          recurrenceType: input.recurrenceType ?? "ONCE",
          leads: input.leads && input.leads.length > 0 ? input.leads : [DEFAULT_LEAD],
        });
        const reminder = await createReminder(ctx.userId, parsed);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "reminder.create",
          targetType: "Reminder",
          targetId: reminder.id,
          workId: reminder.linkType === "WORK" ? (reminder.linkId ?? undefined) : undefined,
          summary: `El asistente de IA creó el recordatorio "${reminder.title}".`,
        });

        return toolSuccess(`Recordatorio "${reminder.title}" creado.`, {
          id: reminder.id,
          title: reminder.title,
          date: reminder.date,
          scope: reminder.scope,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "reminder.cancel",
    {
      title: "Cancelar recordatorio",
      description: "Cancela un recordatorio (deja de disparar); no borra el historial de avisos ya enviados.",
      inputSchema: { reminderId: z.string().uuid() },
    },
    async ({ reminderId }) => {
      try {
        const userCtx = await getUserContext(ctx.userId);
        const existing = await prisma.reminder.findUnique({ where: { id: reminderId } });
        if (!existing) throw notFound("Recordatorio no encontrado");
        if (!canMutate(userCtx, existing)) throw forbidden();

        await deleteReminder(ctx.userId, reminderId);

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "reminder.cancel",
          targetType: "Reminder",
          targetId: reminderId,
          summary: `El asistente de IA canceló el recordatorio "${existing.title}".`,
        });

        return toolSuccess(`Recordatorio "${existing.title}" cancelado.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
