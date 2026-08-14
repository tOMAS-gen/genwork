import { prisma } from "@/lib/db/client";
import { forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";

/**
 * Carga un proyecto exigiendo un nivel mínimo de acceso.
 *
 * Extraído de src/app/api/works/[id]/route.ts en la feature 059 para que las
 * rutas de otorgamientos de cliente usen exactamente el mismo gate y no una
 * copia que pueda divergir.
 *
 * Sin acceso responde 404 y no 403: no filtra la existencia del recurso (contrato
 * del repo).
 */
export async function getWorkWithAccess(userId: string, id: string, need: "read" | "operate") {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true, publicRead: true } },
      stage: { select: { id: true, name: true, color: true } },
    },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (need === "operate" && level !== "operate") throw forbidden();
  return { work, ctx, level };
}
