import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { pushConfigured } from "@/server/notifications/push";
export const GET = withApi(async () => {
  const session = await requireWriter();
  const p = await prisma.pushPreference.findUnique({ where: { userId: session.user.id } });
  return Response.json({
    reminders: p?.reminders ?? true,
    urgent: p?.urgent ?? true,
    configured: pushConfigured(),
  });
});
export const PATCH = withApi(async (req) => {
  const session = await requireWriter();
  const body = z.object({ reminders: z.boolean(), urgent: z.boolean() }).parse(await req.json());
  return Response.json(
    await prisma.pushPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...body },
      update: body,
    }),
  );
});
