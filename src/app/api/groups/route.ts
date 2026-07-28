import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { enqueue } from "@/lib/storage/queue";
import { countUnfinishedByKey } from "@/lib/domain/tasks/unfinishedCount";

export const GET = withApi(async () => {
  const session = await requireWriter();
  const isSuperAdmin = session.user.globalRole === "SUPERADMIN";

  const groups = await prisma.group.findMany({
    where: isSuperAdmin
      ? {}
      : {
          OR: [
            { memberships: { some: { userId: session.user.id } } },
            { publicRead: true },
          ],
        },
    include: {
      memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
      _count: { select: { works: true } },
    },
    orderBy: { name: "asc" },
  });

  const groupIds = groups.map((g) => g.id);

  // feature 054: contador de tareas no finalizadas por grupo.
  // Se calcula como la suma de las tareas no finalizadas de los sectores
  // pertenecientes a cada grupo (clarify session 2026-07-28 Q1).
  // Los sectores dentro de un mismo grupo son disjuntos → sin dedupe entre
  // sectores; pero dentro de un mismo sector deduplicamos por taskId por
  // defensa contra TaskLink duplicados. countUnfinishedByKey hace ambas cosas.
  const sectorsOfGroups = await prisma.sector.findMany({
    where: { groupId: { in: groupIds } },
    select: { id: true, groupId: true },
  });
  const sectorIds = sectorsOfGroups.map((s) => s.id);
  const sectorToGroup = new Map(sectorsOfGroups.map((s) => [s.id, s.groupId]));

  let pendingByGroup: Record<string, number> = {};
  if (sectorIds.length > 0) {
    const [looseTasks, execLinks] = await Promise.all([
      prisma.task.findMany({
        where: { sectorId: { in: sectorIds }, workId: null },
        select: { id: true, sectorId: true, status: { select: { type: true } } },
      }),
      prisma.taskLink.findMany({
        where: { type: "EXEC", sectorId: { in: sectorIds }, task: { work: { isTemplate: false } } },
        select: {
          taskId: true,
          sectorId: true,
          task: { select: { status: { select: { type: true } } } },
        },
      }),
    ]);

    // Aporte de tareas loose: cada task es única por definición (una sola row).
    const looseContribution = looseTasks.map((t) => ({
      id: t.id,
      status: t.status,
      key: t.sectorId ? sectorToGroup.get(t.sectorId) ?? null : null,
    }));

    // Aporte de EXEC links: dedup por (taskId, sectorId) → un mismo taskId puede
    // aparecer dos veces si linkea a dos sectores distintos del MISMO grupo.
    // countUnfinishedByKey deduplica por task.id dentro de la misma key (grupo),
    // así que dos sectores del mismo grupo con la misma tarea sumarían 1, no 2.
    // (En la práctica los sectores son disjuntos; esto es una salvaguarda.)
    const execContribution = execLinks.map((l) => ({
      id: l.taskId,
      status: l.task.status,
      key: l.sectorId ? sectorToGroup.get(l.sectorId) ?? null : null,
    }));

    pendingByGroup = countUnfinishedByKey<string>([
      ...looseContribution,
      ...execContribution,
    ]);
  }

  const result = groups.map((g) => ({
    ...g,
    pendingCount: pendingByGroup[g.id] ?? 0,
  }));

  return NextResponse.json(result);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().nullable().optional(),
});

export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { name, color } = createSchema.parse(await req.json());

  const existing = await prisma.group.findUnique({ where: { name } });
  if (existing) throw conflict(`Ya existe un grupo llamado "${name}"`);

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.group.create({
      data: {
        name,
        color: color ?? null,
        ownerId: session.user.id,
        memberships: { create: { userId: session.user.id, role: "ADMIN" } },
      },
    });

    await tx.taskStatus.createMany({
      data: [
        { name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS", sortOrder: 0, groupId: createdGroup.id },
        { name: "Hecha", color: "#22c55e", type: "FINAL", sortOrder: 1, groupId: createdGroup.id },
      ],
    });

    return createdGroup;
  });

  // FR-034: carpeta compartida del grupo en la mini nube
  await enqueue({ kind: "CREATE_GROUP_FOLDER", groupId: group.id, groupName: name });
  return NextResponse.json(group, { status: 201 });
});
