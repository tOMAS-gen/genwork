import { z } from "zod";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { listNotifications } from "@/server/notifications/service";
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const query = z
    .object({
      kind: z.enum(["REMINDER", "URGENT"]).optional(),
      cursor: z.string().uuid().optional(),
    })
    .parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json(await listNotifications(session.user.id, query.kind, query.cursor));
});
