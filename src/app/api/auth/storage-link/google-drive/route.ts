import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";

/** DELETE /api/auth/storage-link/google-drive — desvincula la identidad Google Drive activa del usuario. */
export const DELETE = withApi(async () => {
  const session = await requireInternal();

  await prisma.storageIdentity.updateMany({
    where: {
      userId: session.user.id,
      provider: "GDRIVE",
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return new Response(null, { status: 204 });
});
