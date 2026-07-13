import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";
import { reorderTasks, loadApplicableStatusSet, execSectorIdsOf, statusOptionDto } from "@/server/tasks";

const reorderSchema = z.object({
  orderedTaskIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedTaskIds no puede tener IDs duplicados",
    }),
});

/**
 * Reordena manualmente las tareas de un Trabajo (feature 052). El cliente envía
 * la lista COMPLETA de IDs en el nuevo orden; el servidor valida que coincide
 * exactamente con las tareas actuales (409 TASK_SET_CHANGED si no) y reasigna
 * `position` dentro de una transacción.
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const ctx = await getUserContext(session.user.id);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();

  const { orderedTaskIds } = reorderSchema.parse(await req.json());

  await reorderTasks(id, orderedTaskIds);

  emit({ type: "work-changed", workId: id });

  const tasks = await prisma.task.findMany({
    where: { workId: id },
    orderBy: { position: "asc" },
    include: {
      links: { include: { sector: true, user: { select: { id: true, name: true } } } },
      homeSector: { select: { id: true, name: true } },
      work: { select: { id: true, name: true } },
      labels: { include: { value: { include: { key: true } } } },
      status: true,
    },
  });

  return NextResponse.json(
    await Promise.all(
      tasks.map(async ({ labels, ...task }) => {
        const applicable = await loadApplicableStatusSet(
          task.workId,
          task.sectorId,
          execSectorIdsOf(task.links),
        );
        return {
          ...task,
          statusOptions: applicable.map(statusOptionDto),
          labels: labels.map((l) => ({
            keyId: l.keyId,
            keyName: l.value.key.name,
            valueId: l.valueId,
            valueName: l.value.name,
            color: l.value.color,
          })),
        };
      }),
    ),
  );
});
