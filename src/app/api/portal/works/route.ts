import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireClient } from "@/server/guards";
import { listClientWorks } from "@/server/portal";

/**
 * Proyectos que un cliente externo tiene otorgados (feature 059, FR-015).
 *
 * Este namespace expone únicamente GET: un cliente no escribe nada, en ningún lado.
 */
export const GET = withApi(async () => {
  const session = await requireClient();
  return NextResponse.json(await listClientWorks(session.user.id));
});
