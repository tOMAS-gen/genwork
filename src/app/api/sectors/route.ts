import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access, accessSector } from "@/lib/domain/permissions";

export const GET = withApi(async () => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  const sectors = await prisma.sector.findMany({
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      _count: { select: { taskLinks: { where: { type: "EXEC" } } } },
    },
    orderBy: { name: "asc" },
  });

  const visible = sectors.filter(
    (s) =>
      accessSector(ctx, {
        id: s.id,
        groupId: s.groupId,
        ownerId: s.ownerId,
        groupPublicRead: s.group?.publicRead ?? false,
      }) !== "none",
  );
  return NextResponse.json(visible);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  groupId: z.string().uuid().nullable().optional(),
});

export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { name, groupId } = createSchema.parse(await req.json());

  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) !== "operate") {
    throw forbidden("No sos miembro de ese grupo");
  }

  const dup = await prisma.sector.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe un sector llamado "${name}" en este ámbito`);

  const sector = await prisma.sector.create({ data: { name, ...scope } });
  return NextResponse.json(sector, { status: 201 });
});
