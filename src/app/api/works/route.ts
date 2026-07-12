import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { enqueue } from "@/lib/storage/queue";
import { cloneTasksFromTemplate } from "@/lib/domain/works/cloneFromTemplate";
import { buildProjectCode } from "@/lib/domain/works/projectCode";

export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const filter = url.searchParams.get("filter");

  const where: Prisma.WorkWhereInput =
    filter === "templates"
      ? { isTemplate: true, status: "ACTIVE" }
      : { status, isTemplate: false };

  const works = await prisma.work.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      stage: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const visible = works.filter(
    (w) =>
      access(ctx, {
        groupId: w.groupId,
        ownerId: w.ownerId,
        groupPublicRead: w.group?.publicRead ?? false,
      }) !== "none",
  );

  const workIds = visible.map((w) => w.id);

  const doneCounts = await prisma.task.groupBy({
    by: ["workId"],
    where: { workId: { in: workIds }, status: { type: "FINAL" } },
    _count: true,
  });
  const doneByWorkId = new Map(doneCounts.map((d) => [d.workId, d._count]));

  // sectores distintos con tareas por work (para mostrar chips de sector en el dashboard)
  const sectorGroups = await prisma.task.groupBy({
    by: ["workId", "sectorId"],
    where: { workId: { in: workIds }, sectorId: { not: null } },
  });
  const sectorIdsByWorkId = new Map<string, string[]>();
  for (const g of sectorGroups) {
    if (!g.sectorId) continue;
    const list = sectorIdsByWorkId.get(g.workId!) ?? [];
    list.push(g.sectorId);
    sectorIdsByWorkId.set(g.workId!, list);
  }

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: session.user.id, workId: { in: workIds } },
    select: { workId: true },
  });
  const favoriteWorkIds = new Set(favorites.map((f) => f.workId));

  // FR-408/409: una sola query para todas las asignaciones, agrupadas por work (evita N+1)
  const workLabels = await prisma.workLabel.findMany({
    where: { workId: { in: workIds } },
    include: { value: { include: { key: true } } },
  });
  const labelsByWorkId = new Map<
    string,
    { keyId: string; keyName: string; isPrimary: boolean; valueId: string; valueName: string; color: string }[]
  >();
  for (const l of workLabels) {
    const list = labelsByWorkId.get(l.workId) ?? [];
    list.push({
      keyId: l.keyId,
      keyName: l.value.key.name,
      isPrimary: l.isPrimary,
      valueId: l.valueId,
      valueName: l.value.name,
      color: l.value.color,
    });
    labelsByWorkId.set(l.workId, list);
  }

  const result = visible.map((w) => ({
    ...w,
    taskCounts: { done: doneByWorkId.get(w.id) ?? 0, total: w._count.tasks },
    labels: labelsByWorkId.get(w.id) ?? [],
    sectorIds: sectorIdsByWorkId.get(w.id) ?? [],
    isFavorite: favoriteWorkIds.has(w.id),
  }));

  return NextResponse.json(result);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(280).optional(),
  groupId: z.string().uuid().nullable().optional(),
  cloneFromId: z.string().uuid().optional(),
  isTemplate: z.boolean().optional(),
});

/** Crear proyecto en su ámbito (FR-027) + carpeta en la mini nube (FR-029, vía cola). */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { name, description, groupId, cloneFromId, isTemplate } = createSchema.parse(await req.json());

  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) !== "operate") {
    throw forbidden("No sos miembro de ese grupo");
  }

  const dup = await prisma.work.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe un proyecto llamado "${name}" en este ámbito`);

  if (cloneFromId) {
    const template = await prisma.work.findUnique({
      where: { id: cloneFromId },
      select: { id: true, isTemplate: true, status: true },
    });
    if (!template || !template.isTemplate || template.status !== "ACTIVE") {
      throw badRequest("La plantilla seleccionada no existe o no está activa");
    }
  }

  const work = await prisma.$transaction(async (tx) => {
    const newWork = await tx.work.create({
      data: {
        name,
        description: description || null,
        ...scope,
        createdById: session.user.id,
        isTemplate: isTemplate ?? false,
        doc: { create: {} },
      },
    });

    if (cloneFromId) {
      await cloneTasksFromTemplate(cloneFromId, newWork.id, session.user.id, tx);
    }

    return newWork;
  });

  // Código de referencia (feature 035): la carpeta del proyecto en el
  // almacenamiento se nombra con GRUPO-SEQ-PROYECTO para que coincida con el
  // código visible en la plataforma y sea ubicable en el Drive/Nextcloud.
  const groupName = scope.groupId
    ? (await prisma.group.findUnique({ where: { id: scope.groupId }, select: { name: true } }))?.name ?? null
    : null;
  const code = buildProjectCode(groupName, work.folderSeq, name);

  await enqueue({
    kind: "CREATE_WORK_FOLDER",
    workId: work.id,
    workName: code,
    groupId: scope.groupId,
    ownerUserId: scope.ownerId,
  });

  return NextResponse.json(work, { status: 201 });
});
