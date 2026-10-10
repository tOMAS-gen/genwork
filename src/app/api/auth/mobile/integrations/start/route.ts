import { z } from "zod";
import { withApi } from "@/server/api";
import { startMobileIntegration } from "@/server/mobile-integrations";
const schema = z.object({ purpose: z.enum(["drive", "gmail"]), codeChallenge: z.string() });
export const POST = withApi(async (req) => {
  const { purpose, codeChallenge } = schema.parse(await req.json());
  return Response.json(
    await startMobileIntegration(
      req.headers.get("authorization"),
      new URL(req.url).origin,
      purpose,
      codeChallenge,
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
});
