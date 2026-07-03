import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { enqueue } from "@/lib/storage/queue";

export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  const works = await prisma.work.findMany({
    where: { status },
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
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
  return NextResponse.json(visible);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(280).optional(),
  groupId: z.string().uuid().nullable().optional(),
});

/** Crear proyecto en su ámbito (FR-027) + carpeta en la mini nube (FR-029, vía cola). */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { name, description, groupId } = createSchema.parse(await req.json());

  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) !== "operate") {
    throw forbidden("No sos miembro de ese grupo");
  }

  const dup = await prisma.work.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe un proyecto llamado "${name}" en este ámbito`);

  const work = await prisma.work.create({
    data: {
      name,
      description: description || null,
      ...scope,
      createdById: session.user.id,
      doc: { create: {} },
    },
  });

  await enqueue({
    kind: "CREATE_WORK_FOLDER",
    workId: work.id,
    workName: name,
    groupId: scope.groupId,
    ownerUserId: scope.ownerId,
  });

  return NextResponse.json(work, { status: 201 });
});
