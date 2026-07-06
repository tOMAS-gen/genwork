import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { BoardGrid } from "@/components/board/BoardGrid";

/**
 * Vista de dashboard pelada para pantallas/TV y rol Lector (feature 004, US3,
 * FR-307/308): sin drawer ni controles de navegación. Fuera del grupo (main)
 * a propósito: la URL /board queda reservada para la vista con shell.
 */
export default async function TvPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <BoardGrid />;
}
