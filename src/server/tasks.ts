/**
 * Servicio de tareas: parseo de etiquetas (fuente de verdad en el backend, FR-008),
 * resolución a entidades del ámbito, permisos y vínculos tipados.
 */

import { prisma } from "@/lib/db/client";
import { parseTags, tagsBySymbol, normalizeTagName } from "@/lib/domain/tags/parser";
import { toggleState } from "@/lib/domain/tasks/state";
import {
  canAddress,
  canToggle,
  type Scope,
  type SectorRef,
  type TaskRef,
  type UserContext,
} from "@/lib/domain/permissions";
import { conflict, forbidden, notFound } from "@/server/api";
import { emit } from "@/server/events";
import type { Prisma, Sector, Task, TaskLink, User, Work, Group } from "@prisma/client";

export type TaskWithLinks = Task & {
  links: (TaskLink & { sector: Sector | null; user: Pick<User, "id" | "name"> | null })[];
  work: Pick<Work, "id" | "name"> | null;
  homeSector: Pick<Sector, "id" | "name"> | null;
};

const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true } },
  homeSector: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

export function scopeOf(entity: { groupId: string | null; ownerId: string | null }): Scope {
  return { groupId: entity.groupId, ownerId: entity.ownerId };
}

function scopeWithPublic(entity: {
  groupId: string | null;
  ownerId: string | null;
  group?: Pick<Group, "publicRead"> | null;
}): Scope {
  return {
    groupId: entity.groupId,
    ownerId: entity.ownerId,
    groupPublicRead: entity.group?.publicRead ?? false,
  };
}

export async function toTaskRef(task: TaskWithLinks): Promise<TaskRef> {
  const [work, homeSector] = await Promise.all([
    task.workId
      ? prisma.work.findUnique({ where: { id: task.workId }, include: { group: true } })
      : null,
    task.sectorId
      ? prisma.sector.findUnique({ where: { id: task.sectorId }, include: { group: true } })
      : null,
  ]);

  const sectorIds = task.links
    .filter((l) => l.targetType === "SECTOR" && l.sectorId)
    .map((l) => l.sectorId as string);
  const sectors = await prisma.sector.findMany({
    where: { id: { in: sectorIds } },
    include: { group: true },
  });
  const sectorRef = (s: (typeof sectors)[number]): SectorRef => ({
    id: s.id,
    ...scopeWithPublic(s),
  });
  const byId = new Map(sectors.map((s) => [s.id, s]));

  const linksOf = (type: "EXEC" | "REF") =>
    task.links
      .filter((l) => l.type === type && l.targetType === "SECTOR" && l.sectorId)
      .map((l) => byId.get(l.sectorId as string))
      .filter((s): s is (typeof sectors)[number] => Boolean(s))
      .map(sectorRef);

  return {
    workScope: work ? scopeWithPublic(work) : null,
    homeSector: homeSector ? { id: homeSector.id, ...scopeWithPublic(homeSector) } : null,
    execSectors: linksOf("EXEC"),
    refSectors: linksOf("REF"),
    refUserIds: new Set(
      task.links
        .filter((l) => l.type === "REF" && l.targetType === "USER" && l.userId)
        .map((l) => l.userId as string),
    ),
  };
}

interface ResolveInput {
  rawText: string;
  contextWorkId?: string;
  contextSectorId?: string;
}

interface Resolved {
  displayText: string;
  workId: string | null;
  homeSectorId: string | null;
  execSectorIds: string[];
  refSectorIds: string[];
  refUserIds: string[];
}

/**
 * Resuelve el texto crudo a entidades. Reglas:
 * - `/` explícito gana sobre el contexto (FR-007); requiere canAddress (FR-038).
 * - `#`/`@` resuelven dentro del ámbito de la tarea; `@` puede ser sector o usuario (FR-041).
 * - Nombres inexistentes → conflict 409 { unresolvedTags } (FR-009).
 * - Tarea creada desde un sector lleva EXEC a ese sector (FR-038).
 */
export async function resolveTask(ctx: UserContext, input: ResolveInput): Promise<Resolved> {
  const { displayText, tags } = parseTags(input.rawText);
  const grouped = tagsBySymbol(tags);
  const unresolved: { symbol: string; name: string }[] = [];

  const contextSector = input.contextSectorId
    ? await prisma.sector.findUnique({ where: { id: input.contextSectorId } })
    : null;
  if (input.contextSectorId && !contextSector) throw notFound("Sector no encontrado");

  const contextWork = input.contextWorkId
    ? await prisma.work.findUnique({ where: { id: input.contextWorkId } })
    : null;
  if (input.contextWorkId && !contextWork) throw notFound("Trabajo no encontrado");

  // Ámbito de referencia para resolver nombres: el del contexto donde se escribe
  const contextScope: Scope = contextWork
    ? scopeOf(contextWork)
    : contextSector
      ? scopeOf(contextSector)
      : { groupId: null, ownerId: ctx.id };

  const scopeWhere =
    contextScope.groupId !== null
      ? { groupId: contextScope.groupId }
      : { ownerId: contextScope.ownerId ?? ctx.id };

  // --- `/trabajo`: destino explícito gana al contexto ---
  let workId: string | null = contextWork?.id ?? null;
  const workName = grouped["/"][0];
  if (workName) {
    const candidates = await prisma.work.findMany({
      where: { ...scopeWhere, status: "ACTIVE" },
    });
    const target = candidates.find(
      (w) => normalizeTagName(w.name) === normalizeTagName(workName),
    );
    if (!target) {
      unresolved.push({ symbol: "/", name: workName });
    } else if (!canAddress(ctx, scopeOf(target))) {
      throw forbidden(`No podés direccionar tareas hacia "${target.name}"`);
    } else {
      workId = target.id;
    }
  }

  // --- `#sector`: ejecución ---
  const sectors = await prisma.sector.findMany({ where: scopeWhere });
  const findSector = (name: string) =>
    sectors.find((s) => normalizeTagName(s.name) === normalizeTagName(name));

  const execSectorIds = new Set<string>();
  for (const name of grouped["#"]) {
    const s = findSector(name);
    if (!s) unresolved.push({ symbol: "#", name });
    else execSectorIds.add(s.id);
  }
  // Tarea escrita desde un sector: EXEC al sector actual (FR-038)
  if (contextSector) execSectorIds.add(contextSector.id);

  // --- `@referencia`: sector o usuario (FR-041) ---
  const refSectorIds = new Set<string>();
  const refUserIds = new Set<string>();
  if (grouped["@"].length > 0) {
    const users = await prisma.user.findMany({ where: { globalRole: { not: "READER" } } });
    for (const name of grouped["@"]) {
      const s = findSector(name);
      if (s) {
        refSectorIds.add(s.id);
        continue;
      }
      const u = users.find(
        (x) =>
          normalizeTagName(x.name) === normalizeTagName(name) ||
          normalizeTagName(x.email.split("@")[0]) === normalizeTagName(name),
      );
      if (u) refUserIds.add(u.id);
      else unresolved.push({ symbol: "@", name });
    }
  }

  if (unresolved.length > 0) {
    throw conflict("Hay etiquetas que no coinciden con nada existente", {
      unresolvedTags: unresolved,
    });
  }

  // Sin trabajo: queda como tarea suelta del sector de contexto (edge case spec)
  const homeSectorId = workId ? null : (contextSector?.id ?? null);
  if (!workId && !homeSectorId) {
    throw conflict("La tarea necesita un trabajo (/) o crearse dentro de un sector");
  }

  return {
    displayText,
    workId,
    homeSectorId,
    execSectorIds: [...execSectorIds],
    refSectorIds: [...refSectorIds],
    refUserIds: [...refUserIds],
  };
}

export async function saveTask(
  ctx: UserContext,
  input: ResolveInput & { taskId?: string },
): Promise<TaskWithLinks> {
  const resolved = await resolveTask(ctx, input);

  const linksData = [
    ...resolved.execSectorIds.map((sectorId) => ({
      type: "EXEC" as const,
      targetType: "SECTOR" as const,
      targetId: sectorId,
      sectorId,
    })),
    ...resolved.refSectorIds.map((sectorId) => ({
      type: "REF" as const,
      targetType: "SECTOR" as const,
      targetId: sectorId,
      sectorId,
    })),
    ...resolved.refUserIds.map((userId) => ({
      type: "REF" as const,
      targetType: "USER" as const,
      targetId: userId,
      userId,
    })),
  ];

  const task = input.taskId
    ? await prisma.task.update({
        where: { id: input.taskId },
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          links: { deleteMany: {}, create: linksData },
        },
        include: taskInclude,
      })
    : await prisma.task.create({
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          creatorId: ctx.id,
          links: { create: linksData },
        },
        include: taskInclude,
      });

  emit({
    type: "task-changed",
    taskId: task.id,
    workId: task.workId,
    sectorIds: [
      ...new Set([
        ...resolved.execSectorIds,
        ...resolved.refSectorIds,
        ...(resolved.homeSectorId ? [resolved.homeSectorId] : []),
      ]),
    ],
  });

  return task;
}

export async function getTaskOrThrow(taskId: string): Promise<TaskWithLinks> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
  if (!task) throw notFound("Tarea no encontrada");
  return task;
}

export async function toggleTask(ctx: UserContext, taskId: string): Promise<TaskWithLinks> {
  const task = await getTaskOrThrow(taskId);
  const ref = await toTaskRef(task);
  if (!canToggle(ctx, ref)) {
    throw forbidden(
      "Esta tarea se completa desde su sector de ejecución (#) o su trabajo, no desde una referencia",
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: toggleState(task.state, ctx.id, new Date()),
    include: taskInclude,
  });

  emit({
    type: "task-changed",
    taskId,
    workId: task.workId,
    sectorIds: task.links.filter((l) => l.sectorId).map((l) => l.sectorId as string),
  });
  return updated;
}
