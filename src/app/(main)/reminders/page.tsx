import { auth } from "@/server/auth";
import { RemindersView } from "@/components/reminders/RemindersView";

/** Vista principal de recordatorios (calendario mensual). */
export default async function RemindersPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.globalRole === "SUPERADMIN";
  return <RemindersView isSuperAdmin={isSuperAdmin} />;
}
