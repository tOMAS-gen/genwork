import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";
import { reorderTasks } from "@/server/tasks";
import { rootTaskWithSubtasksInclude, toTaskDto } from "@/server/taskDto";

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

  // 062-subtareas (hallazgo Importante A de revisión): reorderTasks solo
  // reordena raíces (parentId: null); la respuesta tiene que devolver el MISMO
  // contrato que works/[id]/route.ts (raíces con hijas anidadas en `subtasks`,
  // `parentText`/`subtaskCount`/`subtaskDone`) porque la página le pisa el
  // estado a `work.tasks` con esta respuesta tal cual — devolver el shape
  // plano viejo dejaba a las hijas como filas raíz y rompía el progreso.
  const tasks = await prisma.task.findMany({
    where: { workId: id, parentId: null },
    orderBy: { position: "asc" },
    include: rootTaskWithSubtasksInclude,
  });

  return NextResponse.json(await Promise.all(tasks.map((task) => toTaskDto(task, task.subtasks))));
});
