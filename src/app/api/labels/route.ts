import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireLabelAdmin, requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";

/**
 * GET /api/labels?groupId= — claves y valores del ámbito (grupo o personal, FR-408).
 * Lectura: cualquiera con acceso al ámbito (miembro del grupo, dueño personal, o super-admin).
 */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  const groupId = new URL(req.url).searchParams.get("groupId");
  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) === "none") {
    throw forbidden("No tenés acceso a ese grupo");
  }

  const keys = await prisma.labelKey.findMany({
    where: scope,
    include: { values: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      values: k.values.map((v) => ({ id: v.id, name: v.name, color: v.color })),
    })),
  );
});

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  groupId: z.string().uuid().nullable().optional(),
});

/**
 * POST /api/labels — crea una clave en el ámbito (grupo o personal).
 * Gate de admin del ámbito (FR-408): dueño personal / canManageGroup / super-admin.
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { name, groupId } = createKeySchema.parse(await req.json());

  const scope = groupId
    ? { groupId, ownerId: null }
    : { groupId: null, ownerId: session.user.id };

  await requireLabelAdmin(session.user.id, scope);

  const dup = await prisma.labelKey.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe una etiqueta llamada "${name}" en este ámbito`);

  const key = await prisma.labelKey.create({ data: { name, ...scope } });
  return NextResponse.json({ id: key.id, name: key.name, values: [] }, { status: 201 });
});
