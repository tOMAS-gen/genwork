import { z } from "zod";
import { withApi } from "@/server/api";
import { cancelMobileIntegration } from "@/server/mobile-integrations";
export const POST = withApi(async (req) => {
  const { flowId } = z.object({ flowId: z.string().uuid() }).parse(await req.json());
  await cancelMobileIntegration(req.headers.get("authorization"), flowId);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});
