/**
 * POST /api/works/[id]/files/enable — habilita la carpeta de storage del
 * proyecto (feature 054, contracts/api.md + research.md D4). Idempotente.
 *
 * Guard: SUPERADMIN, ADMIN del grupo del work, o dueño si el work es personal
 * (`canEnableWorkFolder`). Work invisible para el caller → 404; visible pero
 * sin rol suficiente → 403.
 *
 * Idempotencia: `updateMany` condicional sobre `folderEnabledAt: null` — ante
 * dos requests simultáneas solo la que "gana" la condición encola el job
 * `CREATE_WORK_FOLDER`; la otra devuelve el estado actual sin re-encolar.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { canEnableWorkFolder } from "@/lib/storage/access-check";
import { enqueue } from "@/lib/storage/queue";
import { buildProjectCode } from "@/lib/domain/works/projectCode";

export const POST = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const ctx = await getUserContext(session.user.id);
  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { name: true, publicRead: true } } },
  });
  if (!work) throw notFound();

  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();

  if (!canEnableWorkFolder(ctx, work)) {
    throw forbidden("Solo un administrador puede habilitar la carpeta de este proyecto");
  }

  // Idempotencia transaccional: solo una request "gana" el flip de
  // folderEnabledAt (null → ahora) y encola el job; el resto no re-encola.
  const claimed = await prisma.work.updateMany({
    where: { id, folderEnabledAt: null },
    data: { folderEnabledAt: new Date() },
  });

  if (claimed.count === 1) {
    // Código de referencia (feature 035): la carpeta se nombra
    // GRUPO-SEQ-PROYECTO, igual que hacía la creación del work.
    const code = buildProjectCode(work.group?.name ?? null, work.folderSeq, work.name);
    await enqueue({
      kind: "CREATE_WORK_FOLDER",
      workId: work.id,
      workName: code,
      groupId: work.groupId,
      ownerUserId: work.ownerId,
    });
  }

  return NextResponse.json({
    folderEnabled: true,
    folderCreated: work.nextcloudFolderPath != null,
  });
});
