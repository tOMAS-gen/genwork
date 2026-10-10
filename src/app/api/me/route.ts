import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/**
 * Identidad del usuario autenticado, para filtros cliente (ej. "Mis proyectos") y
 * la cabecera de la app móvil (feature 064: nombre, correo y avatar).
 */
export const GET = withApi(async () => {
  const session = await requireSession();
  return NextResponse.json({
    id: session.user.id,
    globalRole: session.user.globalRole,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? null,
  });
});
