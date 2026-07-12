import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { enqueue } from "@/lib/storage/queue";
import { computeArchivePath, computeRenamePath } from "@/lib/storage/paths";
import { emit } from "@/server/events";
import { labelScopeOf } from "@/lib/domain/labels/availability";
import { buildProjectCode } from "@/lib/domain/works/projectCode";
import { loadApplicableStatusSet, execSectorIdsOf, statusOptionDto } from "@/server/tasks";

async function getWorkWithAccess(userId: string, id: string, need: "read" | "operate") {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      stage: { select: { id: true, name: true, color: true } },
    },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  // Sin acceso: 404, no filtra existencia (contrato)
  if (level === "none") throw notFound();
  if (need === "operate" && level !== "operate") throw forbidden();
  return { work, ctx };
}

/** Página completa del trabajo: doc + tareas + adjuntos (Principio III). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "read");

  const full = await prisma.work.findUnique({
    where: { id: work.id },
    include: {
      group: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true, color: true } },
      doc: true,
      attachments: { orderBy: { createdAt: "desc" } },
      tasks: {
        orderBy: { position: "asc" },
        include: {
          links: { include: { sector: true, user: { select: { id: true, name: true } } } },
          homeSector: { select: { id: true, name: true } },
          work: { select: { id: true, name: true } },
          labels: { include: { value: { include: { key: true } } } },
          status: true,
        },
      },
      archive: true,
      labels: { include: { value: { include: { key: true } } } },
    },
  });
  if (!full) return NextResponse.json(full);

  // FR-408/409: no exponemos el include crudo de Prisma, aplanamos al shape del contrato
  const { labels, tasks, ...rest } = full;
  return NextResponse.json({
    ...rest,
    // Código de referencia legible de la carpeta del proyecto (feature 035)
    code: buildProjectCode(full.group?.name ?? null, full.folderSeq, full.name),
    labels: labels.map((l) => ({
      keyId: l.keyId,
      keyName: l.value.key.name,
      isPrimary: l.isPrimary,
      valueId: l.valueId,
      valueName: l.value.name,
      color: l.value.color,
      scope: labelScopeOf({ groupId: l.value.key.groupId, ownerId: l.value.key.ownerId }),
    })),
    tasks: await Promise.all(
      tasks.map(async ({ labels: taskLabels, ...task }) => {
        const applicable = await loadApplicableStatusSet(
          task.workId,
          task.sectorId,
          execSectorIdsOf(task.links),
        );
        return {
          ...task,
          statusOptions: applicable.map(statusOptionDto),
          labels: taskLabels.map((l) => ({
            keyId: l.keyId,
            keyName: l.value.key.name,
            valueId: l.valueId,
            valueName: l.value.name,
            color: l.value.color,
          })),
        };
      }),
    ),
  });
});

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(280).nullable().optional(),
    dueDate: z
      .string()
      .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Fecha inválida" })
      .nullable()
      .optional(),
    stageId: z.string().uuid().nullable().optional(),
    isTemplate: z.boolean().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.dueDate !== undefined ||
      v.stageId !== undefined ||
      v.isTemplate !== undefined ||
      v.status !== undefined,
    { message: "Nada para actualizar" },
  );

/** Renombrar/editar descripción conserva todos los vínculos (FR-015): apuntan al ID. */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "operate");

  const body = patchSchema.parse(await req.json());
  if (body.name && body.name !== work.name) {
    const dup = await prisma.work.findFirst({
      where: { groupId: work.groupId, ownerId: work.ownerId, name: body.name, id: { not: id } },
    });
    if (dup) throw conflict(`Ya existe un proyecto llamado "${body.name}" en este ámbito`);
  }

  const updated = await prisma.work.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.dueDate !== undefined
        ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
        : {}),
      ...(body.stageId !== undefined ? { stageId: body.stageId } : {}),
      ...(body.isTemplate !== undefined ? { isTemplate: body.isTemplate } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });
  if (work.nextcloudFolderPath) {
    if (body.status && body.status !== work.status) {
      const direction = body.status === "ARCHIVED" ? "archive" : "unarchive";
      const toPath = computeArchivePath(work.nextcloudFolderPath, direction);
      await enqueue({
        kind: "MOVE_WORK_FOLDER",
        workId: id,
        fromPath: work.nextcloudFolderPath,
        toPath,
      });
    }
    if (body.name && body.name !== work.name) {
      const currentPath = updated.nextcloudFolderPath ?? work.nextcloudFolderPath;
      const toPath = computeRenamePath(currentPath, work.folderSeq, body.name);
      await enqueue({
        kind: "RENAME_WORK_FOLDER",
        workId: id,
        fromPath: currentPath,
        toPath,
      });
    }
  }

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(updated);
});

const deleteSchema = z.object({ confirmName: z.string() });

/**
 * Eliminación definitiva (FR-032): borra la carpeta completa en la mini nube
 * y todos los datos del proyecto, con confirmación por nombre (acción destructiva).
 * Funciona tanto para proyectos activos como archivados.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "operate");

  const { confirmName } = deleteSchema.parse(await req.json());
  if (confirmName.trim() !== work.name) {
    throw conflict("El nombre no coincide; escribí el nombre exacto del proyecto para confirmar");
  }

  if (work.nextcloudFolderPath) {
    const storage = await getStorageProvider();
    if (storage) {
      await storage.deleteFolder(work.nextcloudFolderPath);
    }
  }
  await prisma.work.delete({ where: { id } });

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
