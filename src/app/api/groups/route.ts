import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { enqueue } from "@/lib/storage/queue";

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
            { sectors: { some: { grants: { some: { userId: session.user.id } } } } },
          ],
        },
    include: {
      memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
      _count: { select: { sectors: true, works: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
});

const createSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** FR-021: cualquier usuario crea grupos; el creador queda como admin principal. */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { name } = createSchema.parse(await req.json());

  const existing = await prisma.group.findUnique({ where: { name } });
  if (existing) throw conflict(`Ya existe un grupo llamado "${name}"`);

  const group = await prisma.group.create({
    data: {
      name,
      ownerId: session.user.id,
      memberships: { create: { userId: session.user.id, role: "ADMIN" } },
    },
  });
  // FR-034: carpeta compartida del grupo en la mini nube
  await enqueue({ kind: "CREATE_GROUP_FOLDER", groupId: group.id, groupName: name });
  return NextResponse.json(group, { status: 201 });
});
