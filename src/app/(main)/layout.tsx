import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { DrawerNav } from "@/components/nav/DrawerNav";
import { Shell } from "@/components/nav/Shell";
import { LogOut } from "@/components/ui/icons";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPERADMIN";
  const isReader = session.user.globalRole === "READER";
  if (isReader) redirect("/tv");

  return (
    <Shell
      sidebar={
        <DrawerNav
          isSuperAdmin={isSuperAdmin}
          userEmail={session.user.email}
          userName={session.user.name}
          userImage={session.user.image}
          logoutButton={
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                className="btn btn-ghost sidebar-logout-btn"
                type="submit"
                title="Salir"
              >
                <LogOut size={15} /> <span className="sidebar-logout-label">Salir</span>
              </button>
            </form>
          }
        />
      }
    >
      {children}
    </Shell>
  );
}
