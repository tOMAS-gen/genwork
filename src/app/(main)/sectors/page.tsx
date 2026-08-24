import { auth } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { prisma } from "@/lib/db/client";
import { SectorsView } from "@/components/sectors/SectorsView";

export default async function SectorsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <SectorsView canCreate={false} adminGroups={[]} isSuperAdmin={false} groupColors={{}} />
      </div>
    );
  }

  const ctx = await getUserContext(session.user.id);
  const isSuperAdmin = ctx.globalRole === "SUPERADMIN";
  const [adminGroups, groupPalette] = await Promise.all([
    ctx.adminGroupIds.size > 0
      ? prisma.group.findMany({
          where: { id: { in: [...ctx.adminGroupIds] } },
          select: { id: true, name: true },
        })
      : [],
    // feature 060: el color pinta el encabezado de cada sección de sectores.
    // `/api/sectors` no lo devuelve, así que viaja como prop desde acá en vez de
    // sumar un request extra en cascada desde el cliente.
    prisma.group.findMany({ select: { id: true, color: true } }),
  ]);
  const groupColors = Object.fromEntries(groupPalette.map((g) => [g.id, g.color]));

  // Ámbito Personal siempre cuenta: cualquier usuario logueado puede crear ahí.
  const canCreate = true;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <SectorsView
        canCreate={canCreate}
        adminGroups={adminGroups}
        isSuperAdmin={isSuperAdmin}
        groupColors={groupColors}
      />
    </div>
  );
}
