import { NextResponse } from "next/server";
import { notFound, withApi } from "@/server/api";
import { requireClientWork } from "@/server/guards";
import { getPortalWork } from "@/server/portal";

/**
 * Detalle de un proyecto otorgado (feature 059, FR-016/FR-017).
 *
 * Sin otorgamiento responde 404 y no 403 (FR-022): para un cliente, un proyecto
 * que no le fue otorgado sencillamente no existe. Lo mismo si el proyecto está
 * archivado: el acceso se conserva, la visibilidad no.
 */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  await requireClientWork(id);

  const work = await getPortalWork(id);
  if (!work) throw notFound();
  return NextResponse.json(work);
});
