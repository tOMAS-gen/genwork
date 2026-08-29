import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle } from "@/lib/domain/permissions";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";
import { parseTags } from "@/lib/domain/tags/parser";
import { getTaskOrThrow, saveTask, syncParentStatus, toTaskRef } from "@/server/tasks";
import { emit } from "@/server/events";

const patchSchema = z.union([
  z.object({
    parentId: z.string().uuid().nullable(),
  }),
  z.object({
    rawText: z.string().trim().min(1),
    editContext: z.enum(["work", "sector"]),
  }),
  z.object({
    description: z.string().max(2000).nullable(),
  }),
]);

/**
 * Editar el texto re-parsea todo; el cambio se ve en todas las vistas (FR-008).
 * Propiedad de edición (FR-401/402/403): `editContext` indica desde qué vista se edita.
 * Desde "sector" la tarea solo se edita si es de origen SECTOR y no fue adoptada por un
 * proyecto (FR-403), y no puede reasignar `/` (FR-404, 409 WORK_LOCKED). Desde "work" se
 * permite todo como hoy, y si la tarea era de origen SECTOR sin adoptar, queda adoptada.
 */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const task = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();

  const body = patchSchema.parse(await req.json());

  if ("parentId" in body) {
    const previousParentId = task.parentId;
    const nextParentId = body.parentId;

    // Ruling 2026-08-29 (revisión Tarea 11, hallazgo Importante C): al colgar
    // una tarea de un padre, si la tarea NO tiene ningún EXEC propio, hereda
    // los del padre (si ya tiene los suyos, se respetan — delegación
    // explícita). Sin esto queda el mismo "pendiente invisible" que el
    // ruling anterior cerró para la creación: el padre pasa a ser
    // contenedor y deja de contar, y la tarea colgada no cuenta en ningún
    // sector. Al promover (`parentId: null`) no se toca ningún link.
    let inheritedLinksData: { type: "EXEC"; targetType: "SECTOR"; targetId: string; sectorId: string }[] = [];

    if (nextParentId) {
      if (nextParentId === id) throw badRequest("Una tarea no puede colgar de sí misma");

      const parent = await prisma.task.findUnique({ where: { id: nextParentId } });
      if (!parent) throw notFound("Tarea padre no encontrada");

      // Un solo nivel de anidado: el destino no puede ser a su vez una subtarea.
      if (parent.parentId) throw badRequest("Una subtarea no puede tener subtareas");

      // Misma pertenencia que el padre (proyecto o sector home).
      if (parent.workId !== task.workId || parent.sectorId !== task.sectorId) {
        throw badRequest("La subtarea tiene que pertenecer al mismo proyecto o sector que el padre");
      }

      // La tarea que se mueve no puede arrastrar hijas propias abiertas (evita 2 niveles).
      const openChildren = await prisma.task.count({
        where: { parentId: id, status: { type: { not: "FINAL" } } },
      });
      if (openChildren > 0) {
        throw badRequest("Sacá primero las subtareas de esta tarea antes de moverla");
      }

      const ownExecLinks = task.links.filter((l) => l.type === "EXEC");
      if (ownExecLinks.length === 0) {
        const parentExecLinks = await prisma.taskLink.findMany({
          where: { taskId: nextParentId, type: "EXEC" },
          select: { sectorId: true },
        });
        inheritedLinksData = parentExecLinks
          .filter((l): l is { sectorId: string } => l.sectorId != null)
          .map((l) => ({ type: "EXEC" as const, targetType: "SECTOR" as const, targetId: l.sectorId, sectorId: l.sectorId }));
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        parentId: nextParentId,
        ...(inheritedLinksData.length > 0 ? { links: { create: inheritedLinksData } } : {}),
      },
      include: {
        links: { include: { sector: true, user: { select: { id: true, name: true } } } },
        work: { select: { id: true, name: true, status: true } },
        homeSector: { select: { id: true, name: true } },
      },
    });

    // Sincronizar los dos extremos: el padre viejo (puede quedar sin hijas o con
    // todas terminadas) y el padre nuevo (una hija recién llegada puede reabrirlo).
    if (previousParentId) await syncParentStatus(previousParentId, ctx.id);
    if (nextParentId) await syncParentStatus(nextParentId, ctx.id);

    emit({
      type: "task-changed",
      taskId: id,
      workId: task.workId,
      sectorIds: updated.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
    });

    return NextResponse.json(updated);
  }

  if ("description" in body) {
    const updated = await prisma.task.update({
      where: { id },
      data: { description: body.description },
      include: {
        links: { include: { sector: true, user: { select: { id: true, name: true } } } },
        work: { select: { id: true, name: true, status: true } },
        homeSector: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  }

  const { rawText, editContext } = body;

  if (!canEditTaskText({ originType: task.originType, adoptedAt: task.adoptedAt }, editContext)) {
    throw forbidden("Esta tarea se edita desde el proyecto");
  }

  if (editContext === "sector") {
    const { tags } = parseTags(rawText);
    if (tags.some((t) => t.symbol === "/")) {
      throw conflict("El proyecto se cambia desde el proyecto", { code: "WORK_LOCKED" });
    }
  }

  const adopt = editContext === "work" && task.originType === "SECTOR" && task.adoptedAt === null;

  const updated = await saveTask(ctx, {
    rawText,
    taskId: id,
    contextWorkId: task.workId ?? undefined,
    contextSectorId: task.sectorId ?? undefined,
    editMeta: { lastEditedById: ctx.id, adopt },
  });
  return NextResponse.json(updated);
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const task = await getTaskOrThrow(id);
  if (!canToggle(ctx, await toTaskRef(task))) throw forbidden();

  // Contar y capturar el padre ANTES de borrar: el cascade de la FK (Task 4)
  // se lleva las hijas junto con la tarea, así que después el conteo daría
  // cero y ya no sabríamos a quién sincronizar.
  const deletedSubtasks = await prisma.task.count({ where: { parentId: id } });
  const parentId = task.parentId;

  await prisma.task.delete({ where: { id } });
  emit({
    type: "task-changed",
    taskId: id,
    workId: task.workId,
    sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });

  // Si esta tarea era una hija, borrarla puede haber sido la última pendiente:
  // sincronizar al padre después del borrado para que se cierre solo.
  if (parentId) await syncParentStatus(parentId, ctx.id);

  return NextResponse.json({ deletedSubtasks });
});
