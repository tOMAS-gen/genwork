import { prisma } from "@/lib/db/client";
import type { UserContext } from "@/lib/domain/permissions";

/** Arma el UserContext del motor de permisos con una consulta por colección. */
export async function getUserContext(userId: string): Promise<UserContext> {
  const [user, memberships, grants, readerGrants] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.groupMembership.findMany({ where: { userId } }),
    prisma.sectorGrant.findMany({ where: { userId }, include: { sector: true } }),
    prisma.readerGrant.findMany({ where: { userId } }),
  ]);

  return {
    id: userId,
    globalRole: user.globalRole,
    memberGroupIds: new Set(memberships.map((m) => m.groupId)),
    adminGroupIds: new Set(memberships.filter((m) => m.role === "ADMIN").map((m) => m.groupId)),
    grantedSectorIds: new Set(grants.map((g) => g.sectorId)),
    grantedSectorGroupIds: new Set(
      grants.map((g) => g.sector.groupId).filter((id): id is string => id !== null),
    ),
    readerGroupIds: new Set(readerGrants.map((r) => r.groupId)),
  };
}
