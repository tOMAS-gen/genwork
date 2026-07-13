import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** DELETE /api/auth/storage-link/nextcloud — desvincula la identidad Nextcloud activa del usuario. */
export const DELETE = withApi(async () => {
  const session = await requireSession();

  await prisma.storageIdentity.updateMany({
    where: {
      userId: session.user.id,
      provider: "NEXTCLOUD",
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return new Response(null, { status: 204 });
});
