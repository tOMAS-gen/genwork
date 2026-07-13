import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ApiError, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { NextcloudProvider } from "@/lib/storage/nextcloud";
import { assertWorkAccess, confineWorkPath } from "@/lib/storage/access-check";
import { StorageIdentityMissingError } from "@/lib/storage/identity";

async function getWorkWithAccess(userId: string, id: string) {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
  });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  return { work, ctx };
}

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const { work } = await getWorkWithAccess(session.user.id, id);

  if (!work.nextcloudFolderPath) {
    return NextResponse.json({ files: [], nextcloudUrl: null, folderSeq: work.folderSeq });
  }

  const { searchParams } = new URL(req.url);
  const subpath = searchParams.get("path") || undefined;

  let storage;
  try {
    storage = await getStorageProvider();
  } catch {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
      { status: 503 },
    );
  }

  if (!storage) {
    return NextResponse.json({ files: [], nextcloudUrl: null, folderSeq: work.folderSeq });
  }

  try {
    const raw = await storage.listShallow(work.nextcloudFolderPath, subpath);
    const basePath = work.nextcloudFolderPath;
    const files = raw.map((f) => ({
      ...f,
      path: f.path.startsWith(basePath) ? f.path.slice(basePath.length + 1) : f.path,
    }));
    let nextcloudUrl: string | null = null;
    if (storage instanceof NextcloudProvider) {
      const ncUrl = process.env.NEXTCLOUD_URL?.replace(/\/$/, "") ?? "";
      const dir = subpath
        ? `${work.nextcloudFolderPath}/${subpath}`
        : work.nextcloudFolderPath;
      nextcloudUrl = ncUrl ? `${ncUrl}/apps/files/?dir=${encodeURIComponent(dir)}` : null;
    }

    return NextResponse.json({ files, nextcloudUrl, folderSeq: work.folderSeq });
  } catch {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
      { status: 503 },
    );
  }
});

/**
 * Elimina un archivo o carpeta (recursivo si es carpeta) dentro del Work (FR-003).
 * Deniega antes de tocar el proveedor (FR-005) y confina el `path` recibido del
 * cliente dentro de la carpeta del Work (FR-007). Si el proveedor activo no
 * implementa `delete`, responde 501 `STORAGE_OP_NOT_SUPPORTED` (FR-008).
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const { work } = await assertWorkAccess(session.user.id, id, "operate");

  if (!work.nextcloudFolderPath) {
    throw notFound("Sin carpeta de archivos configurada");
  }

  const { searchParams } = new URL(req.url);
  const subpath = searchParams.get("path");
  const fullPath = confineWorkPath(work.nextcloudFolderPath, subpath);

  if (fullPath === work.nextcloudFolderPath.replace(/\/+$/, "")) {
    throw new ApiError(400, "INVALID_PATH", "No se puede eliminar la carpeta raíz del trabajo");
  }

  let storage;
  try {
    storage = await getStorageProvider(session.user.id);
  } catch (err) {
    if (err instanceof StorageIdentityMissingError) {
      throw new ApiError(424, "STORAGE_IDENTITY_MISSING", err.message, {
        linkUrl: "/settings",
      });
    }
    throw err;
  }

  if (!storage) {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
      { status: 503 },
    );
  }

  if (typeof storage.delete !== "function") {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_OP_NOT_SUPPORTED",
          message: "El proveedor de almacenamiento activo no soporta eliminar archivos",
        },
      },
      { status: 501 },
    );
  }

  try {
    await storage.delete(fullPath);
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "NOT_FOUND") {
      throw notFound("El archivo o carpeta no existe");
    }
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
      { status: 503 },
    );
  }

  return new NextResponse(null, { status: 204 });
});
