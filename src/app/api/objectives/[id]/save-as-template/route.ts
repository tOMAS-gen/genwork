import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { saveObjectiveAsTemplate } from "@/server/objectives";

/**
 * objetivos: guardar un objetivo como plantilla PERSONAL del actor (nombre =
 * título; si choca, "Título (2)"…). El body es `{}` y no se lee.
 * 201 `{id, name, copiedTasks}`. Operar el proyecto del objetivo.
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  const ctx = await getUserContext(session.user.id);

  const template = await saveObjectiveAsTemplate(ctx, id);
  return NextResponse.json(template, { status: 201 });
});
