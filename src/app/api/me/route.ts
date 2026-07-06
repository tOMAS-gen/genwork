import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/** Identidad mínima del usuario autenticado, para filtros cliente (ej. "Mis proyectos"). */
export const GET = withApi(async () => {
  const session = await requireSession();
  return NextResponse.json({ id: session.user.id });
});
