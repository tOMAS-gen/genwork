import { prisma } from "@/lib/db/client";
import type { StorageProvider } from "@/lib/storage/provider";

function difference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

export async function permissionAudit(
  groupId: string,
  storage: StorageProvider,
  storageGroupId: string,
): Promise<string | null> {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: { select: { nextcloudUserId: true } } },
  });

  const expectedUserIds = new Set(
    memberships
      .map((membership) => membership.user.nextcloudUserId)
      .filter((nextcloudUserId): nextcloudUserId is string => nextcloudUserId !== null),
  );

  const storageMembers = await storage.listGroupMembers({ storageGroupId });
  const actualUserIds = new Set(storageMembers.map((member) => member.storageUserId));

  const missingInStorage = difference(expectedUserIds, actualUserIds);
  const extraInStorage = difference(actualUserIds, expectedUserIds);

  if (missingInStorage.length === 0 && extraInStorage.length === 0) {
    return null;
  }

  const details: string[] = [];
  if (missingInStorage.length > 0) {
    details.push(`faltan en Nextcloud: ${missingInStorage.join(", ")}`);
  }
  if (extraInStorage.length > 0) {
    details.push(`sobran en Nextcloud: ${extraInStorage.join(", ")}`);
  }

  return `Diferencia de permisos para el grupo ${groupId}: ${details.join("; ")}`;
}
