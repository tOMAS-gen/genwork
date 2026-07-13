/**
 * Migración de nombres de carpeta a minúsculas (FR-007, research.md R5).
 *
 * Recorre todos los `Work` con carpeta Nextcloud ya creada cuyo nombre de
 * carpeta actual (último segmento de `nextcloudFolderPath`) no esté ya en
 * minúsculas, y encola un `RENAME_WORK_FOLDER` (kind existente) con el
 * `toPath` recalculado vía `computeRenamePath` (mismo `folderSeq`, mismo
 * nombre del proyecto, ahora en minúsculas gracias a `formatFolderName`).
 *
 * Corre una vez por boot del server (`instrumentation.ts`), sin gatillo
 * manual. Es idempotente: sin proyectos desalineados no encola nada, y no
 * duplica jobs si ya hay un `RENAME_WORK_FOLDER` `PENDING` para el mismo
 * `workId`.
 */

import { prisma } from "@/lib/db/client";
import { enqueue } from "./queue";
import { computeRenamePath } from "./paths";

/** Último segmento de una ruta `/genwork/grupo/000-nombre`. */
function lastSegment(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

export async function migrateWorkFolderNames(): Promise<void> {
  const works = await prisma.work.findMany({
    where: { nextcloudFolderPath: { not: null } },
    select: { id: true, name: true, folderSeq: true, nextcloudFolderPath: true },
  });

  for (const work of works) {
    const currentPath = work.nextcloudFolderPath;
    if (!currentPath) continue;

    const folderName = lastSegment(currentPath);
    // Ya en minúsculas → nada que migrar.
    if (folderName === folderName.toLowerCase()) continue;

    const toPath = computeRenamePath(currentPath, work.folderSeq, work.name);
    // Nada que hacer si el recálculo no cambia la ruta.
    if (toPath === currentPath) continue;

    // No duplicar: si ya hay un RENAME pendiente para este trabajo, saltar.
    const existing = await prisma.provisioningJob.findFirst({
      where: {
        kind: "RENAME_WORK_FOLDER",
        status: "PENDING",
        payload: { path: ["workId"], equals: work.id },
      },
    });
    if (existing) continue;

    await enqueue({
      kind: "RENAME_WORK_FOLDER",
      workId: work.id,
      fromPath: currentPath,
      toPath,
    });
  }
}
