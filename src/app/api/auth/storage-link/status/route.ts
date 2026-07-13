import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** GET /api/auth/storage-link/status — estado de vinculación del usuario para el provider activo. */
export const GET = withApi(async () => {
  const session = await requireSession();

  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const provider = config?.storageProvider ?? "NEXTCLOUD";

  const identity = await prisma.storageIdentity.findFirst({
    where: {
      userId: session.user.id,
      provider,
      revokedAt: null,
    },
    select: { linkedAt: true },
  });

  return NextResponse.json({
    provider,
    linked: Boolean(identity),
    ...(identity ? { linkedAt: identity.linkedAt.toISOString() } : {}),
  });
});
