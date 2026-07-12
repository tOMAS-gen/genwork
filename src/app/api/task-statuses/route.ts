import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access, accessSector, canManageGroup } from "@/lib/domain/permissions";
import { listApplicableSet, createStatus, type StatusScope } from "@/server/taskStatus";

/**
 * Resuelve el `StatusScope` desde query params/body y calcula si el usuario puede
 * escribir en él (`canWrite`), sin lanzar excepción por eso — así `GET` puede
 * consultar el permiso sin autorizar una escritura. Cuando `requireWrite` es `true`
 * (uso desde `POST`), lanza `forbidden` si `canWrite` da `false`, igual que antes.
 */
async function resolveScopeAndAuthorize(
  ctx: Awaited<ReturnType<typeof getUserContext>>,
  params: { groupId?: string | null; ownerId?: string | null; sectorId?: string | null; global?: boolean },
  requireWrite: boolean,
): Promise<{ scope: StatusScope; canWrite: boolean }> {
  if (params.global) {
    const canWrite = ctx.globalRole === "SUPERADMIN";
    if (requireWrite && !canWrite) {
      throw forbidden("Solo el administrador del sistema administra los estados globales");
    }
    return { scope: { global: true }, canWrite };
  }
  if (params.sectorId) {
    const sector = await prisma.sector.findUnique({
      where: { id: params.sectorId },
      include: { group: { select: { publicRead: true } } },
    });
    if (!sector) throw notFound("Sector no encontrado");
    const canWrite =
      accessSector(ctx, {
        id: sector.id,
        groupId: sector.groupId,
        ownerId: sector.ownerId,
        groupPublicRead: sector.group?.publicRead ?? false,
      }) === "operate";
    if (requireWrite && !canWrite) throw forbidden("No administrás ese sector");
    return { scope: { sectorId: params.sectorId }, canWrite };
  }
  if (params.groupId) {
    const canWrite = canManageGroup(ctx, params.groupId);
    if (requireWrite && !canWrite) {
      throw forbidden("El conjunto general de un grupo solo lo edita un administrador");
    }
    return { scope: { groupId: params.groupId }, canWrite };
  }
  const ownerId = params.ownerId ?? ctx.id;
  const canWrite = access(ctx, { groupId: null, ownerId }) === "operate";
  if (requireWrite && !canWrite) {
    throw forbidden("No podés editar el conjunto personal de otro usuario");
  }
  return { scope: { ownerId }, canWrite };
}

/** GET /api/task-statuses?groupId=|ownerId=|sectorId= — conjunto aplicable a ese scope. */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);
  const { scope, canWrite } = await resolveScopeAndAuthorize(
    ctx,
    {
      groupId: url.searchParams.get("groupId"),
      ownerId: url.searchParams.get("ownerId"),
      sectorId: url.searchParams.get("sectorId"),
      global: url.searchParams.get("global") === "true",
    },
    false,
  );

  const { inherited, statuses } = await listApplicableSet(scope);
  return NextResponse.json({
    inherited,
    canWrite,
    statuses: statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      type: s.type,
      sortOrder: s.sortOrder,
    })),
  });
});

const createSchema = z.object({
  groupId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  global: z.boolean().optional(),
  name: z.string().trim().min(1).max(80),
  color: z.string().refine(isValidHex, "Color inválido"),
  type: z.enum(["IN_PROGRESS", "FINAL"]),
});

/** POST /api/task-statuses — crea un estado nuevo en el conjunto del scope indicado. */
export const POST = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const body = createSchema.parse(await req.json());
  const { scope } = await resolveScopeAndAuthorize(ctx, body, true);

  const status = await createStatus(scope, {
    name: body.name,
    color: normalizeHex(body.color)!,
    type: body.type,
  });
  return NextResponse.json(
    { id: status.id, name: status.name, color: status.color, type: status.type, sortOrder: status.sortOrder },
    { status: 201 },
  );
});
