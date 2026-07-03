import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { emit } from "@/server/events";

async function getWorkWithAccess(userId: string, id: string, need: "read" | "operate") {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
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
      doc: true,
      attachments: { orderBy: { createdAt: "desc" } },
      tasks: {
        orderBy: { createdAt: "asc" },
        include: {
          links: { include: { sector: true, user: { select: { id: true, name: true } } } },
          homeSector: { select: { id: true, name: true } },
          work: { select: { id: true, name: true } },
        },
      },
      archive: true,
    },
  });
  return NextResponse.json(full);
});

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(280).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Nada para actualizar",
  });

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
    },
  });
  emit({ type: "work-changed", workId: id });
  return NextResponse.json(updated);
});

const deleteSchema = z.object({ confirmName: z.string() });

/**
 * Eliminación definitiva (FR-032): solo trabajos ARCHIVED con export confirmado.
 * Borra la carpeta completa en la mini nube y todos los datos, con confirmación
 * por nombre (acción destructiva). Trabajo activo → 409: ofrecer archivar.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id, "operate");

  const archive = await prisma.archiveRecord.findUnique({ where: { workId: id } });
  if (work.status !== "ARCHIVED" || archive?.status !== "CONFIRMED") {
    throw conflict("Primero hay que archivar el proyecto (exportar y confirmar el paquete)");
  }

  const { confirmName } = deleteSchema.parse(await req.json());
  if (confirmName.trim() !== work.name) {
    throw conflict("El nombre no coincide; escribí el nombre exacto del proyecto para confirmar");
  }

  // Primero la carpeta en la mini nube; si falla, los datos quedan intactos
  if (work.nextcloudFolderPath) {
    const storage = await getStorageProvider();
    await storage.deleteFolder(work.nextcloudFolderPath);
  }
  await prisma.work.delete({ where: { id } }); // cascada: tasks, links, doc, attachments, archive

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
