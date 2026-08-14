import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { LogOut } from "@/components/ui/icons";

/**
 * Portal de cliente (feature 059).
 *
 * Fuera del grupo (main) porque necesita su propio armazón, igual que /tv.
 *
 * Es exclusivo del rol cliente: un usuario interno rebota a la aplicación. Deja
 * el gate de /api/portal en un solo rol, trivialmente auditable; la verificación
 * se hace con una cuenta de cliente real (DEV_USERS.cliente en local).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole !== "CLIENT") redirect("/");

  return (
    <PortalShell
      userName={session.user.name}
      logoutButton={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn btn-ghost" type="submit" title="Salir">
            <LogOut size={15} /> Salir
          </button>
        </form>
      }
    >
      {children}
    </PortalShell>
  );
}
