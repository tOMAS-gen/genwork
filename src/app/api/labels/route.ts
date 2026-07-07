import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, forbidden, withApi } from "@/server/api";
import { requireLabelAdmin, requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { labelScopeOf } from "@/lib/domain/labels/availability";

/**
 * GET /api/labels?groupId= — unión de etiquetas disponibles para el ámbito
 * (globales + grupo o globales + personal, FR-001/002/003/007). Sin duplicados,
 * cada clave anotada con su `scope` (R3/R4).
 */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);

  const groupId = new URL(req.url).searchParams.get("groupId");

  if (groupId && access(ctx, { groupId, ownerId: null }) === "none") {
    throw forbidden("No tenés acceso a ese grupo");
  }

  const keys = await prisma.labelKey.findMany({
    where: {
      OR: [
        { groupId: null, ownerId: null },
        ...(groupId
          ? [{ groupId, ownerId: null }]
          : [{ groupId: null, ownerId: session.user.id }]),
      ],
    },
    include: { values: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    keys
      .map((k) => ({
        id: k.id,
        name: k.name,
        scope: labelScopeOf(k),
        values: k.values.map((v) => ({ id: v.id, name: v.name, color: v.color })),
      }))
      .sort((a, b) =>
        a.scope === b.scope ? a.name.localeCompare(b.name) : a.scope === "global" ? -1 : 1,
      ),
  );
});

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  groupId: z.string().uuid().nullable().optional(),
  global: z.boolean().optional(),
});

/**
 * POST /api/labels — crea una clave en el ámbito (global, grupo o personal).
 * Gate de admin del ámbito (FR-408): super-admin (global) / canManageGroup / dueño personal.
 */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const { name, groupId, global } = createKeySchema.parse(await req.json());

  const scope =
    global === true
      ? { groupId: null, ownerId: null }
      : groupId
        ? { groupId, ownerId: null }
        : { groupId: null, ownerId: session.user.id };

  await requireLabelAdmin(session.user.id, scope);

  const dup = await prisma.labelKey.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe una etiqueta llamada "${name}" en este ámbito`);

  const key = await prisma.labelKey.create({ data: { name, ...scope } });
  return NextResponse.json(
    { id: key.id, name: key.name, scope: labelScopeOf(key), values: [] },
    { status: 201 },
  );
});
