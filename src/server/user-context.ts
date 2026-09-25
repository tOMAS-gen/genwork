import { prisma } from "@/lib/db/client";
import type { UserContext } from "@/lib/domain/permissions";
import { unauthorized } from "@/server/api";

/**
 * Arma el UserContext del motor de permisos con una consulta por colección.
 *
 * Feature 059: los otorgamientos de cliente se leen acá, en cada petición, y
 * nunca se cachean en el token. Por eso quitarle un proyecto a un cliente surte
 * efecto en su siguiente petición, sin necesidad de que cierre sesión (FR-013).
 * La consulta corre para todos los roles porque el rol todavía no se conoce al
 * lanzar el Promise.all; serializar para ahorrarla le sumaría una ida y vuelta a
 * todas las rutas internas, que es peor (Principio VII).
 */
export async function getUserContext(userId: string): Promise<UserContext> {
  const [user, memberships, grants, readerGrants, clientGrants] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.groupMembership.findMany({ where: { userId } }),
    prisma.sectorGrant.findMany({ where: { userId } }),
    prisma.readerGrant.findMany({ where: { userId } }),
    prisma.clientWorkGrant.findMany({ where: { userId }, select: { workId: true } }),
  ]).catch((err: unknown) => {
    // Sesión huérfana: el token apunta a un usuario que ya no existe (base de
    // dev recreada, usuario borrado). Es 401 y no 500: el cliente vuelve al
    // login. El callback jwt de auth.ts además limpia la cookie al revalidar.
    if ((err as { code?: string }).code === "P2025") throw unauthorized();
    throw err;
  });

  return {
    id: userId,
    globalRole: user.globalRole,
    memberGroupIds: new Set(memberships.map((m) => m.groupId)),
    adminGroupIds: new Set(memberships.filter((m) => m.role === "ADMIN").map((m) => m.groupId)),
    grantedSectorIds: new Set(grants.map((g) => g.sectorId)),
    readerGroupIds: new Set(readerGrants.map((r) => r.groupId)),
    clientWorkIds: new Set(clientGrants.map((g) => g.workId)),
  };
}
