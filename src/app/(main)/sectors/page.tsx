import { auth } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { prisma } from "@/lib/db/client";
import { SectorsView } from "@/components/sectors/SectorsView";

export default async function SectorsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <SectorsView canCreate={false} adminGroups={[]} isSuperAdmin={false} />
      </div>
    );
  }

  const ctx = await getUserContext(session.user.id);
  const isSuperAdmin = ctx.globalRole === "SUPERADMIN";
  const adminGroups = ctx.adminGroupIds.size > 0
    ? await prisma.group.findMany({
        where: { id: { in: [...ctx.adminGroupIds] } },
        select: { id: true, name: true },
      })
    : [];

  // Ámbito Personal siempre cuenta: cualquier usuario logueado puede crear ahí.
  const canCreate = true;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <SectorsView canCreate={canCreate} adminGroups={adminGroups} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
