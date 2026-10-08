import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { assertWorkAccess } from "@/lib/storage/access-check";
import { emit } from "@/server/events";

/**
 * Cierre de una subida directa (navegador → proveedor): genwork no vio pasar el
 * archivo, así que acá avisa a los demás clientes que la carpeta cambió.
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await assertWorkAccess(session.user.id, id, "operate");
  emit({ type: "work-changed", workId: id });
  return NextResponse.json({ ok: true });
});
