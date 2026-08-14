import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canToggle, type TaskRef } from "@/lib/domain/permissions";
import { execSectorIdsOf, loadApplicableStatusSet, statusOptionDto } from "@/server/tasks";
import type { TaskDto } from "@/components/tasks/TaskItem";

/**
 * Construye el TaskRef necesario para el motor de permisos a partir de los
 * datos ya cargados por Prisma, sin consultas adicionales.
 */
function taskRefFromLoadedTask(task: TaskWithPermissionData): TaskRef {
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
type TaskWithPermissionData = {
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

/**
 * Apartado personal "Mis referencias": tareas que me mencionan con @ (FR-041/042).
 * Extiende la respuesta con `work.group`, `statusOptions` y `canToggle` para que
 * la UI pueda agrupar por proyecto/sector y permitir completar cuando el usuario
 * opera el sector REF (feature 057).
 */
export const GET = withApi(async (req) => {
  const session = await requireInternal();
  const url = new URL(req.url);
  const statusId = url.searchParams.get("statusId");
  const type = url.searchParams.get("type");

  const [ctx, links] = await Promise.all([
    getUserContext(session.user.id),
    prisma.taskLink.findMany({
      where: {
        type: "REF",
        targetType: "USER",
        userId: session.user.id,
        task: {
          ...(statusId ? { statusId } : {}),
          ...(type === "IN_PROGRESS" || type === "FINAL" ? { status: { type } } : {}),
          OR: [{ work: { status: "ACTIVE" } }, { workId: null }],
        },
      },
      include: {
        task: {
          include: {
            links: {
              include: {
                sector: { include: { group: { select: { publicRead: true } } } },
                user: { select: { id: true, name: true } },
              },
            },
            work: { include: { group: { select: { id: true, name: true, publicRead: true } } } },
            homeSector: { include: { group: { select: { id: true, name: true, publicRead: true } } } },
            labels: { include: { value: { include: { key: true } } } },
            status: true,
          },
        },
      },
    }),
  ]);

  const enriched = await Promise.all(
    links.map(async (l) => {
      const task = l.task as unknown as TaskWithPermissionData;
      const statusOptions = await loadApplicableStatusSet(
        task.workId,
        task.sectorId,
        execSectorIdsOf(task.links),
      );

      const dto: TaskDto & { canToggle: boolean } = {
        id: task.id,
        rawText: task.rawText,
        displayText: task.displayText,
        status: task.status,
        statusOptions: statusOptions.map(statusOptionDto),
        workId: task.workId,
        work: task.work
          ? {
              id: task.work.id,
              name: task.work.name,
              status: task.work.status,
              group: task.work.group
                ? { id: task.work.group.id, name: task.work.group.name }
                : null,
            }
          : null,
        originType: task.originType,
        adoptedAt: task.adoptedAt ? task.adoptedAt.toISOString() : null,
        homeSector: task.homeSector
          ? {
              id: task.homeSector.id,
              name: task.homeSector.name,
              group: task.homeSector.group
                ? { id: task.homeSector.group.id, name: task.homeSector.group.name }
                : null,
            }
          : null,
        labels: task.labels.map((label) => ({
          keyId: label.keyId,
          keyName: label.value.key.name,
          valueId: label.valueId,
          valueName: label.value.name,
          color: label.value.color,
        })),
        links: task.links.map((link) => ({
          type: link.type,
          targetType: link.targetType,
          sector: link.sector ? { id: link.sector.id, name: link.sector.name, group: null } : null,
          user: link.user,
        })),
        description: task.description,
        canToggle: canToggle(ctx, taskRefFromLoadedTask(task)),
      };
      return dto;
    }),
  );

  return NextResponse.json(enriched);
});
