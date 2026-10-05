import type { TaskRef } from "@/lib/domain/permissions";

/*
 * Mi día: extraído de `me/references/route.ts` para compartirlo con
 * `server/myDay.ts` — ambos listan tareas "personales" ya cargadas con sus
 * relaciones y necesitan el TaskRef sin consultas extra.
 */

/**
 * Construye el TaskRef necesario para el motor de permisos a partir de los
 * datos ya cargados por Prisma, sin consultas adicionales.
 */
export function taskRefFromLoadedTask(task: TaskWithPermissionData): TaskRef {
  const scopeOf = (entity: {
    groupId: string | null;
    ownerId: string | null;
    group?: { publicRead: boolean } | null;
  }) => ({
    groupId: entity.groupId,
    ownerId: entity.ownerId,
    groupPublicRead: entity.group?.publicRead ?? false,
  });

  return {
    workScope: task.work ? scopeOf(task.work) : null,
    homeSector: task.homeSector
      ? { id: task.homeSector.id, ...scopeOf(task.homeSector) }
      : null,
    execSectors: task.links
      .filter((l) => l.type === "EXEC" && l.targetType === "SECTOR" && l.sector)
      .map((l) => ({ id: l.sector!.id, ...scopeOf(l.sector!) })),
    refSectors: task.links
      .filter((l) => l.type === "REF" && l.targetType === "SECTOR" && l.sector)
      .map((l) => ({ id: l.sector!.id, ...scopeOf(l.sector!) })),
    refUserIds: new Set(
      task.links
        .filter((l) => l.type === "REF" && l.targetType === "USER" && l.userId)
        .map((l) => l.userId as string),
    ),
  };
}

/** Tipo intermedio con las relaciones mínimas necesarias para permisos y agrupamiento. */
export type TaskWithPermissionData = {
  id: string;
  rawText: string;
  displayText: string;
  statusId: string;
  workId: string | null;
  sectorId: string | null;
  originType: "WORK" | "SECTOR";
  adoptedAt: Date | null;
  description: string | null;
  position: number;
  objectiveId: string | null;
  objective: { id: string; title: string } | null;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL"; sortOrder: number };
  work: {
    id: string;
    name: string;
    status: string;
    groupId: string | null;
    ownerId: string | null;
    group: { id: string; name: string; publicRead: boolean } | null;
  } | null;
  homeSector: {
    id: string;
    name: string;
    groupId: string | null;
    ownerId: string | null;
    group: { id: string; name: string; publicRead: boolean } | null;
  } | null;
  labels: {
    keyId: string;
    valueId: string;
    value: { name: string; color: string; key: { name: string } };
  }[];
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    userId: string | null;
    sectorId: string | null;
    sector: {
      id: string;
      name: string;
      groupId: string | null;
      ownerId: string | null;
      group: { publicRead: boolean } | null;
    } | null;
    user: { id: string; name: string } | null;
  }[];
};
