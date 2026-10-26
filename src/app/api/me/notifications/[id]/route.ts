import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import {
  notificationTarget,
  ownNotification,
  syncDeliveryNotification,
} from "@/server/notifications/service";
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  return Response.json(await notificationTarget(session.user.id, (await params).id));
});
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const n = await ownNotification(session.user.id, (await params).id);
  const { action } = z.object({ action: z.enum(["READ", "DISMISS"]) }).parse(await req.json());
  await prisma.$transaction(async (tx) => {
    await tx.mobileNotification.update({
      where: { id: n.id },
      data: action === "READ" ? { readAt: new Date() } : { dismissedAt: new Date() },
    });
    if (action === "DISMISS") {
      if (n.deliveryId) {
        await tx.reminderDelivery.update({
          where: { id: n.deliveryId },
          data: { status: "DISMISSED" },
        });
        await syncDeliveryNotification(tx, n.deliveryId);
      } else
        await tx.mobilePushJob.updateMany({
          where: { notificationId: n.id, status: { in: ["PENDING", "SENDING"] } },
          data: { status: "CANCELLED" },
        });
    }
  });
  return new Response(null, { status: 204 });
});
