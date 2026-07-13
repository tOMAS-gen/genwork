import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { StorageIdentityMissingError } from "@/lib/storage/identity";

function canAdminWork(
  ctx: Awaited<ReturnType<typeof getUserContext>>,
  work: { groupId: string | null; ownerId: string | null },
): boolean {
  if (ctx.globalRole === "SUPERADMIN") return true;
  if (work.ownerId !== null) return work.ownerId === ctx.id;
  if (work.groupId !== null) return canManageGroup(ctx, work.groupId);
  return false;
}

/**
 * FR-004/FR-010: revoca un acceso compartido existente en el proveedor y deja
 * trazabilidad local marcando FileShare.revokedAt.
 *
 * Contrato: specs/051-gestion-archivos-nube/contracts/files-crud-and-identity.md
 */
export const DELETE = withApi<{ params: Promise<{ id: string; shareId: string }> }>(
  async (_req, { params }) => {
    const session = await requireSession();
    const { id, shareId } = await params;

    const fileShare = await prisma.fileShare.findFirst({
      where: { id: shareId, workId: id },
      include: { work: { select: { groupId: true, ownerId: true } } },
    });

    if (!fileShare) {
      throw notFound("El acceso compartido no existe");
    }

    const ctx = await getUserContext(session.user.id);
    const canRevoke = fileShare.createdById === session.user.id || canAdminWork(ctx, fileShare.work);
    if (!canRevoke) {
      throw forbidden("No tenés permiso para revocar este acceso compartido");
    }

    let storage;
    try {
      storage = await getStorageProvider(session.user.id);
    } catch (err) {
      if (err instanceof StorageIdentityMissingError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, linkUrl: "/settings" } },
          { status: 424 },
        );
      }
      throw err;
    }

    if (!storage) {
      return NextResponse.json(
        { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
        { status: 503 },
      );
    }

    try {
      await storage.unshare(fileShare.providerShareId);
    } catch (err) {
      console.error("unshare error:", err);
      return NextResponse.json(
        { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
        { status: 503 },
      );
    }

    await prisma.fileShare.update({
      where: { id: fileShare.id },
      data: { revokedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  },
);
