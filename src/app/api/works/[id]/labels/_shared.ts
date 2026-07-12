import { prisma } from "@/lib/db/client";
import { forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";

/** Busca el work y exige que el usuario lo opere (mismo criterio que GET/PATCH /works/{id}). */
export async function getOperableWork(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  // Sin acceso: 404, no filtra existencia (mismo contrato que /works/{id})
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();
  return work;
}
