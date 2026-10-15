import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { getGenstockContext } from "@/server/genstock";
import { requireSuperAdmin } from "@/server/guards";

export const POST = withApi(async () => {
  await requireSuperAdmin();

  try {
    const context = await getGenstockContext();
    return NextResponse.json({
      ok: true,
      detail: `Conexión correcta: ${context.price_lists.length} listas, ${context.warehouses.length} almacenes`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, detail: (err as Error).message });
  }
});
