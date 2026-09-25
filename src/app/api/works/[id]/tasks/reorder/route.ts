import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getWorkWithAccess } from "@/server/works";
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
  // objetivos: sección que se reordena — ausente o null son las tareas
  // generales (el comportamiento de siempre), un id es ese objetivo.
  objectiveId: z.string().uuid().nullable().optional(),
});

/**
 * Reordena manualmente las tareas de un Trabajo (feature 052). El cliente envía
 * la lista COMPLETA de IDs en el nuevo orden; el servidor valida que coincide
 * exactamente con las tareas actuales (409 TASK_SET_CHANGED si no) y reasigna
 * `position` dentro de una transacción.
 *
 * objetivos: la lista es la de UNA sección (`objectiveId`); un objetivo de otro
 * proyecto es 404. El gate es `getWorkWithAccess` (mismo 404/403 que tenía
 * copiado acá).
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getWorkWithAccess(session.user.id, id, "operate");

  const { orderedTaskIds, objectiveId } = reorderSchema.parse(await req.json());

  await reorderTasks(id, orderedTaskIds, objectiveId ?? null);

  emit({ type: "work-changed", workId: id });

  // 062-subtareas (hallazgo Importante A de revisión): reorderTasks solo
  // reordena raíces (parentId: null); la respuesta tiene que devolver el MISMO
  // contrato que works/[id]/route.ts (raíces con hijas anidadas en `subtasks`,
  // `parentText`/`subtaskCount`/`subtaskDone`) porque la página le pisa el
  // estado a `work.tasks` con esta respuesta tal cual — devolver el shape
  // plano viejo dejaba a las hijas como filas raíz y rompía el progreso.
  //
  // objetivos (crítica B1): la respuesta NO cambia de forma — sigue siendo el
  // array plano de TODAS las raíces del proyecto (cada una con su
  // `objectiveId`/`objective`), con el mismo orden que GET works/[id]. La
  // página agrupa por sección del lado del cliente.
  const tasks = await prisma.task.findMany({
    where: { workId: id, parentId: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: rootTaskWithSubtasksInclude,
  });

  return NextResponse.json(await Promise.all(tasks.map((task) => toTaskDto(task, task.subtasks))));
});
