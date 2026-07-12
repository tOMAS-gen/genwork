import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access, accessSector, canManageGroup } from "@/lib/domain/permissions";
import { updateStatus, deleteStatus } from "@/server/taskStatus";

/**
 * Verifica permiso de escritura sobre un TaskStatus existente. Si se pasa
 * `?asSectorId=`, valida el permiso sobre ESE sector (el estado puede ser
 * heredado del grupo/personal — el fork lo maneja `server/taskStatus.ts`).
 */
async function authorizeWrite(
  ctx: Awaited<ReturnType<typeof getUserContext>>,
  statusId: string,
  asSectorId: string | null,
): Promise<void> {
  const status = await prisma.taskStatus.findUnique({ where: { id: statusId } });
  if (!status) throw notFound("Estado no encontrado");

  if (asSectorId) {
    const sector = await prisma.sector.findUnique({
      where: { id: asSectorId },
      include: { group: { select: { publicRead: true } } },
    });
    if (!sector) throw notFound("Sector no encontrado");
    const level = accessSector(ctx, {
      id: sector.id,
      groupId: sector.groupId,
      ownerId: sector.ownerId,
      groupPublicRead: sector.group?.publicRead ?? false,
    });
    if (level !== "operate") throw forbidden("No administrás ese sector");
    return;
  }

  if (status.sectorId) {
    const sector = await prisma.sector.findUnique({
      where: { id: status.sectorId },
      include: { group: { select: { publicRead: true } } },
    });
    if (!sector) throw notFound("Sector no encontrado");
    const level = accessSector(ctx, {
      id: sector.id,
      groupId: sector.groupId,
      ownerId: sector.ownerId,
      groupPublicRead: sector.group?.publicRead ?? false,
    });
    if (level !== "operate") throw forbidden("No administrás ese sector");
    return;
  }
  if (status.groupId) {
    if (!canManageGroup(ctx, status.groupId)) {
      throw forbidden("El conjunto general de un grupo solo lo edita un administrador");
    }
    return;
  }
  if (access(ctx, { groupId: null, ownerId: status.ownerId }) !== "operate") {
    throw forbidden("No podés editar el conjunto personal de otro usuario");
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().refine(isValidHex, "Color inválido").optional(),
    type: z.enum(["IN_PROGRESS", "FINAL"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
    asSectorId: z.string().uuid().optional(),
  })
  .refine((d) => d.name !== undefined || d.color !== undefined || d.type !== undefined || d.sortOrder !== undefined, {
    message: "Debe incluir al menos un campo a editar",
  });

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;
  const { asSectorId, color, ...rest } = patchSchema.parse(await req.json());

  await authorizeWrite(ctx, id, asSectorId ?? null);

  const updated = await updateStatus(id, { ...rest, ...(color ? { color: normalizeHex(color)! } : {}) }, asSectorId);
  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
    type: updated.type,
    sortOrder: updated.sortOrder,
  });
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const { id } = await params;
  const url = new URL(req.url);
  const asSectorId = url.searchParams.get("asSectorId") ?? undefined;
  const confirm = url.searchParams.get("confirm") === "true";

  await authorizeWrite(ctx, id, asSectorId ?? null);
  await deleteStatus(id, { asSectorId, confirm });

  return new NextResponse(null, { status: 204 });
});
