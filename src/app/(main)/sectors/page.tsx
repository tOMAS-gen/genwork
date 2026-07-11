import { auth } from "@/server/auth";
import { SectorsView } from "@/components/sectors/SectorsView";

export default async function SectorsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.globalRole === "SUPERADMIN";
  return <SectorsView isSuperAdmin={isSuperAdmin} />;
}
