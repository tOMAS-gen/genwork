import { SettingsNav } from "@/components/nav/SettingsNav";
import { auth } from "@/server/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isSuperAdmin = session?.user?.globalRole === "SUPERADMIN";

  return (
    <div className="page-stack settings-page">
      <SettingsNav isSuperAdmin={isSuperAdmin} />
      {children}
    </div>
  );
}
