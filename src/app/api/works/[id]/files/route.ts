import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { getStorageProvider } from "@/lib/storage";
import { NextcloudProvider } from "@/lib/storage/nextcloud";

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
