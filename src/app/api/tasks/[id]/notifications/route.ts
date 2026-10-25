import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { notificationTask } from "@/server/notifications/service";
import { taskRecipients } from "@/server/notifications/recipients";
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const task = await notificationTask(session.user.id, id);
  return Response.json({ task, recipientCount: (await taskRecipients(id)).length });
});
