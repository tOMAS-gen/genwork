import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { DrawerNav } from "@/components/nav/DrawerNav";
import { LogOut } from "@/components/ui/icons";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPERADMIN";
  const isReader = session.user.globalRole === "READER";
  if (isReader) redirect("/board");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">genwork</div>
        <DrawerNav isSuperAdmin={isSuperAdmin} />
        <div style={{ marginTop: "auto" }}>
          <div className="muted" style={{ padding: "0 10px 6px" }}>
            {session.user.email}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="btn" style={{ width: "100%", display: "flex", justifyContent: "center", gap: 6, alignItems: "center" }}>
              <LogOut size={15} /> Salir
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
