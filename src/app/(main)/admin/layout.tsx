import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

/**
 * Guard de administración del lado del servidor (feature 059).
 *
 * Varias páginas de /admin son componentes de cliente sin guard propio: sus datos
 * estaban protegidos por el API, pero el armazón de la página se renderizaba igual
 * para cualquiera. Este layout las cubre a todas de una, y cubre también toda
 * página de administración que se agregue en el futuro.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole !== "SUPERADMIN") redirect("/");
  return <>{children}</>;
}
