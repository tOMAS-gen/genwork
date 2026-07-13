import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** DELETE /api/auth/storage-link/google-drive — desvincula la identidad Google Drive activa del usuario. */
export const DELETE = withApi(async () => {
  const session = await requireSession();

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
