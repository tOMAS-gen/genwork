import { z } from "zod";
import { withApi } from "@/server/api";
import { finishMobileIntegration } from "@/server/mobile-integrations";
const schema = z.object({ flowId: z.string().uuid(), codeVerifier: z.string().min(43).max(128) });
export const POST = withApi(async (req) => {
  const { flowId, codeVerifier } = schema.parse(await req.json());
  await finishMobileIntegration(req.headers.get("authorization"), flowId, codeVerifier);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});
