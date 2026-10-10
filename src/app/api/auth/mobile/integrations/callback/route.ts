import { captureMobileIntegration } from "@/server/mobile-integrations";
export async function GET(req: Request) {
  let location = "genwork://integration?error=invalid";
  try {
    location = await captureMobileIntegration(new URL(req.url));
  } catch {
    /* No filtrar códigos OAuth al registro de errores. */
  }
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
