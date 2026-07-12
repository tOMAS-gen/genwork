import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound } from "@/server/api";
import { requireLabelAdmin } from "@/server/guards";
import { access } from "@/lib/domain/permissions";
import { canAssignLabel, labelScopeOf } from "@/lib/domain/labels/availability";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { PRESET_COLORS } from "@/lib/domain/colors/palette";
import { emit } from "@/server/events";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import { logMcpActivity } from "@/lib/mcp/activity";

async function getWorkOperable(ctx: McpAuth, workId: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound("Proyecto no encontrado");
  const level = access(ctx.userContext, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound("Proyecto no encontrado");
  if (level !== "operate") throw forbidden();
  return work;
}

async function nextPresetColor(keyId: string): Promise<string> {
  const count = await prisma.labelValue.count({ where: { keyId } });
  return PRESET_COLORS[count % PRESET_COLORS.length].hex;
}

/**
 * Etiquetas de **tarea** no se asignan acá: se escriben como `$etiqueta` en el
 * texto de `task.create`/`task.update` (Principio II) — ver contracts/mcp-tools.md.
 */
export function registerLabelTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "label.list",
    {
      title: "Listar etiquetas",
      description:
        "Lista las etiquetas disponibles en el ámbito y, si se pasa workId, las ya asignadas a ese proyecto.",
      inputSchema: { workId: z.string().uuid().optional() },
    },
    async ({ workId }) => {
      try {
        const work = workId ? await getWorkOperable(ctx, workId) : null;
        const keys = await prisma.labelKey.findMany({
          where: {
            OR: [
              { groupId: null, ownerId: null },
              ...(work
                ? [{ groupId: work.groupId, ownerId: work.ownerId }]
                : [{ groupId: null, ownerId: ctx.userId }]),
            ],
          },
          include: { values: { orderBy: { name: "asc" } } },
          orderBy: { name: "asc" },
        });
        const available = keys.map((k) => ({
          id: k.id,
          name: k.name,
          scope: labelScopeOf(k),
          values: k.values.map((v) => ({ id: v.id, name: v.name, color: v.color })),
        }));

        let assigned: { key: string; value: string; color: string }[] = [];
        if (workId) {
          const workLabels = await prisma.workLabel.findMany({
            where: { workId },
            include: { value: { include: { key: true } } },
          });
          assigned = workLabels.map((l) => ({
            key: l.value.key.name,
            value: l.value.name,
            color: l.value.color,
          }));
        }

        return toolSuccess(`${available.length} etiqueta(s) disponible(s).`, { available, assigned });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "label.assign",
    {
      title: "Asignar etiqueta a un proyecto",
      description:
        "Asigna el valor de una etiqueta en un proyecto. Crea la clave/valor si no existen, dentro del ámbito del proyecto. Por default se suma como etiqueta secundaria (sin restricción de una por clave). Con `primary: true`, la marca como LA etiqueta principal del proyecto (una sola, da el color de la tarjeta), reemplazando la principal anterior si había una.",
      inputSchema: {
        workId: z.string().uuid(),
        key: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(80),
        color: z.string().refine(isValidHex, "Color inválido").optional(),
        primary: z.boolean().optional(),
      },
    },
    async ({ workId, key, value, color, primary }) => {
      try {
        const work = await getWorkOperable(ctx, workId);
        const scope = { groupId: work.groupId, ownerId: work.ownerId };

        let labelKey = await prisma.labelKey.findFirst({
          where: {
            name: { equals: key, mode: "insensitive" },
            OR: [{ groupId: null, ownerId: null }, scope],
          },
        });
        if (!labelKey) {
          await requireLabelAdmin(ctx.userId, scope);
          labelKey = await prisma.labelKey.create({ data: { name: key, ...scope } });
        } else if (!canAssignLabel(labelKey, work)) {
          throw conflict("La etiqueta no pertenece al mismo ámbito que el proyecto");
        }

        let labelValue = await prisma.labelValue.findFirst({
          where: { keyId: labelKey.id, name: { equals: value, mode: "insensitive" } },
        });
        if (!labelValue) {
          await requireLabelAdmin(ctx.userId, { groupId: labelKey.groupId, ownerId: labelKey.ownerId });
          labelValue = await prisma.labelValue.create({
            data: {
              keyId: labelKey.id,
              name: value,
              color: color ? normalizeHex(color)! : await nextPresetColor(labelKey.id),
            },
          });
        }

        let workLabel;
        if (primary) {
          [, workLabel] = await prisma.$transaction([
            prisma.workLabel.updateMany({ where: { workId, isPrimary: true }, data: { isPrimary: false } }),
            prisma.workLabel.upsert({
              where: { workId_keyId_valueId: { workId, keyId: labelKey.id, valueId: labelValue.id } },
              create: { workId, keyId: labelKey.id, valueId: labelValue.id, isPrimary: true },
              update: { isPrimary: true },
            }),
          ]);
        } else {
          workLabel = await prisma.workLabel.upsert({
            where: { workId_keyId_valueId: { workId, keyId: labelKey.id, valueId: labelValue.id } },
            create: { workId, keyId: labelKey.id, valueId: labelValue.id },
            update: {},
          });
        }

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "label.assign",
          targetType: "WorkLabel",
          targetId: `${workLabel.workId}:${workLabel.keyId}`,
          workId,
          summary: `El asistente de IA etiquetó el proyecto "${work.name}" con ${labelKey.name}: ${labelValue.name}.`,
        });
        emit({ type: "work-changed", workId });

        return toolSuccess(`Etiqueta "${labelKey.name}: ${labelValue.name}" asignada.`, {
          key: labelKey.name,
          value: labelValue.name,
          color: labelValue.color,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "label.unassign",
    {
      title: "Quitar etiqueta de un proyecto",
      description:
        "Quita la asignación de una clave de etiqueta en un proyecto. Con `value`, quita solo ese valor puntual (un proyecto puede tener varios valores asignados de una misma clave); sin `value`, quita todos los valores asignados de esa clave.",
      inputSchema: {
        workId: z.string().uuid(),
        key: z.string().trim().min(1),
        value: z.string().trim().min(1).optional(),
      },
    },
    async ({ workId, key, value }) => {
      try {
        await getWorkOperable(ctx, workId);
        const labelKey = await prisma.labelKey.findFirst({ where: { name: { equals: key, mode: "insensitive" } } });
        if (!labelKey) throw badRequest(`No existe la etiqueta "${key}"`);

        let labelValue = null;
        if (value) {
          labelValue = await prisma.labelValue.findFirst({
            where: { keyId: labelKey.id, name: { equals: value, mode: "insensitive" } },
          });
          if (!labelValue) throw badRequest(`No existe el valor "${value}" para la etiqueta "${key}"`);
        }

        await prisma.workLabel.deleteMany({
          where: labelValue ? { workId, keyId: labelKey.id, valueId: labelValue.id } : { workId, keyId: labelKey.id },
        });

        await logMcpActivity({
          connectionId: ctx.connectionId,
          userId: ctx.userId,
          toolName: "label.unassign",
          targetType: "WorkLabel",
          targetId: `${workId}:${labelKey.id}`,
          workId,
          summary: value
            ? `El asistente de IA quitó el valor "${value}" de la etiqueta "${labelKey.name}" del proyecto.`
            : `El asistente de IA quitó la etiqueta "${labelKey.name}" del proyecto.`,
        });
        emit({ type: "work-changed", workId });

        return toolSuccess(value ? `Valor "${value}" de "${key}" quitado.` : `Etiqueta "${key}" quitada.`);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
