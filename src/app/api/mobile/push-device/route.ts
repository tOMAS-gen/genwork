import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { unauthorized, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { extractMobileToken, sha256Hex } from "@/server/mobile-auth";
import { pushConfigured } from "@/server/notifications/push";

const input = z.object({
  installationId: z.string().uuid(),
  token: z.string().min(20).max(4096),
  platform: z.enum(["android", "ios"]),
  enabled: z.boolean(),
});
async function sessionFor(req: Request) {
  const user = await requireWriter();
  const token = extractMobileToken(req.headers.get("authorization"));
  if (!token) throw unauthorized();
  const session = await prisma.mobileSession.findUnique({ where: { tokenHash: sha256Hex(token) } });
  if (!session || session.revokedAt || session.userId !== user.user.id) throw unauthorized();
  return session;
}
export const PUT = withApi(async (req) => {
  const session = await sessionFor(req);
  const body = input.parse(await req.json());
  await prisma.$transaction(async (tx) => {
    // A reinstall, token rotation or account switch must never retain the old owner.
    await tx.mobilePushDevice.deleteMany({
      where: {
        OR: [
          { token: body.token, installationId: { not: body.installationId } },
          { installationId: body.installationId, sessionId: { not: session.id } },
        ],
      },
    });
    await tx.mobilePushDevice.upsert({
      where: { installationId: body.installationId },
      create: { ...body, sessionId: session.id },
      update: { ...body, sessionId: session.id },
    });
  });
  return Response.json({ configured: pushConfigured() });
});
export const DELETE = withApi(async (req) => {
  const session = await sessionFor(req);
  const { installationId } = input.pick({ installationId: true }).parse(await req.json());
  await prisma.mobilePushDevice.deleteMany({ where: { sessionId: session.id, installationId } });
  return new Response(null, { status: 204 });
});
