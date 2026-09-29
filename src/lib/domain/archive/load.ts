/**
 * Carga de un proyecto en la forma que necesitan los exports de archivado: el
 * ZIP de exportación del sistema (`builder.ts`) y el snapshot que se deja en la
 * carpeta de la nube al archivar (`snapshot.ts`).
 */

import { prisma } from "@/lib/db/client";
import type { ArchivableObjective, ArchivableTask } from "./render";

export interface ArchivableWork {
  id: string;
  name: string;
  description: string | null;
  status: string;
  folderSeq: number;
  folderPath: string | null;
  groupName: string | null;
  ownerEmail: string | null;
  dueDate: Date | null;
  createdAt: Date;
  docContent: unknown;
  tasks: ArchivableTask[];
  objectives: ArchivableObjective[];
}

export async function loadArchivableWork(workId: string): Promise<ArchivableWork> {
  const full = await prisma.work.findUniqueOrThrow({
    where: { id: workId },
    include: {
      doc: true,
      group: { select: { name: true } },
      owner: { select: { email: true } },
      // objetivos (D12): `tareas.md` se agrupa por objetivo, en su orden.
      objectives: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, description: true },
      },
      tasks: {
        // objetivos: antes sin orden; `position` es por sección, así que
        // `createdAt` desempata (mismo criterio que works/[id]).
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          creator: { select: { name: true } },
          completedBy: { select: { name: true } },
          links: { include: { sector: true, user: { select: { name: true } } } },
          status: { select: { type: true } },
        },
      },
    },
  });

  const tasks: ArchivableTask[] = full.tasks.map((t) => ({
    id: t.id,
    parentId: t.parentId,
    objectiveId: t.objectiveId,
    displayText: t.displayText,
    rawText: t.rawText,
    statusType: t.status.type,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
    creatorName: t.creator.name,
    completedByName: t.completedBy?.name ?? null,
    tags: t.links.map((l) => ({
      symbol: l.type === "EXEC" ? "#" : l.targetType === "USER" ? "@" : "@",
      name: l.sector?.name ?? l.user?.name ?? "?",
    })),
  }));

  return {
    id: full.id,
    name: full.name,
    description: full.description,
    status: full.status,
    folderSeq: full.folderSeq,
    folderPath: full.nextcloudFolderPath,
    groupName: full.group?.name ?? null,
    ownerEmail: full.owner?.email ?? null,
    dueDate: full.dueDate,
    createdAt: full.createdAt,
    docContent: full.doc?.content ?? null,
    tasks,
    objectives: full.objectives,
  };
}
