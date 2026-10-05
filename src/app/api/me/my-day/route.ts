import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { listMyDay } from "@/server/myDay";

/** Mi día: tareas marcadas "para hoy" que el usuario puede ver, en orden de agregado. */
export const GET = withApi(async () => {
  const session = await requireInternal();
  const ctx = await getUserContext(session.user.id);
  return NextResponse.json(await listMyDay(ctx));
});
