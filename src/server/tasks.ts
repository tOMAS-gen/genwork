/**
 * Servicio de tareas: parseo de etiquetas (fuente de verdad en el backend, FR-008),
 * resolución a entidades del ámbito, permisos y vínculos tipados.
 */

import { prisma } from "@/lib/db/client";
import { parseTags, tagsBySymbol } from "@/lib/domain/tags/parser";
import { matchByTag, tagMatchesName } from "@/lib/domain/tags/matching";
import { parseDates } from "@/lib/domain/dates/parser";
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
  labels: { keyId: string; valueId: string }[];
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
    const target = matchByTag(workName, candidates, (w) => w.name);
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
  const findSector = (name: string) => matchByTag(name, sectors, (s) => s.name);

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
        (x) => tagMatchesName(name, x.name) || tagMatchesName(name, x.email.split("@")[0]),
      );
      if (u) refUserIds.add(u.id);
      else unresolved.push({ symbol: "@", name });
    }
  }

  // --- `$etiqueta`: valor de etiqueta del ámbito de la tarea (globales + grupo) ---
  const labelsByKey = new Map<string, string>();
  if (grouped["$"].length > 0) {
    // Disponibilidad (feature 031): globales + las del grupo del ámbito de la tarea.
    // Mismo where que GET /api/labels (globales + grupo, sin personales acá).
    const values = await prisma.labelValue.findMany({
      where: {
        key: {
          OR: [
            { groupId: null, ownerId: null },
            ...(contextScope.groupId !== null
              ? [{ groupId: contextScope.groupId, ownerId: null }]
              : []),
          ],
        },
      },
      include: { key: true },
    });
    for (const name of grouped["$"]) {
      const matches = values.filter((v) => tagMatchesName(name, v.name));
      // Nombre presente en >1 clave → ambigüedad: mismo camino que un tag sin resolver.
      const keyIds = new Set(matches.map((v) => v.keyId));
      if (matches.length === 0 || keyIds.size > 1) {
        unresolved.push({ symbol: "$", name });
        continue;
      }
      // Match único (una sola clave): resuelto. Un valor por clave, determinístico.
      const value = matches[0];
      labelsByKey.set(value.keyId, value.id);
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
    labels: [...labelsByKey].map(([keyId, valueId]) => ({ keyId, valueId })),
  };
}

interface EditMeta {
  /** Usuario que hizo la edición de texto (FR-401). */
  lastEditedById: string;
  /** Marca adoptedAt=now si corresponde (edición desde proyecto de tarea de origen SECTOR sin adoptar). */
  adopt?: boolean;
}

/**
 * Calcula la posición de inserción para una tarea nueva dentro de su scope
 * (trabajo, o sector cuando la tarea está suelta): MAX(position) + 1, o 0
 * si no hay tareas previas en ese scope.
 */
async function nextPosition(workId: string | null, homeSectorId: string | null): Promise<number> {
  const where = workId ? { workId } : { workId: null, sectorId: homeSectorId };
  const result = await prisma.task.aggregate({
    where,
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

export async function saveTask(
  ctx: UserContext,
  input: ResolveInput & { taskId?: string; editMeta?: EditMeta },
): Promise<TaskWithLinks> {
  const resolved = await resolveTask(ctx, input);
  const parsedDates = parseDates(input.rawText);
  const dueDate = parsedDates[0]?.iso ? new Date(parsedDates[0].iso) : null;

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

  const labelsData = resolved.labels.map(({ keyId, valueId }) => ({ keyId, valueId }));

  const task = input.taskId
    ? await prisma.task.update({
        where: { id: input.taskId },
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          dueDate,
          links: { deleteMany: {}, create: linksData },
          // Reconciliación (US3/FR-005/FR-007): se borran TODOS los TaskLabel de la
          // tarea y se recrean solo los resueltos del texto nuevo. Si se quitó un
          // $tag, su TaskLabel no vuelve a crearse (queda eliminado). Si se cambió
          // el valor de una clave (ej. $Alta → $Baja), resolveTask ya dedupeó por
          // keyId (Map, un valor por clave: @@id([taskId, keyId])), así que acá se
          // crea un único TaskLabel con el valor nuevo para esa clave.
          labels: { deleteMany: {}, create: labelsData },
          ...(input.editMeta && {
            lastEditedById: input.editMeta.lastEditedById,
            lastEditedAt: new Date(),
            ...(input.editMeta.adopt && { adoptedAt: new Date() }),
          }),
        },
        include: taskInclude,
      })
    : await prisma.task.create({
        data: {
          rawText: input.rawText,
          displayText: resolved.displayText,
          workId: resolved.workId,
          sectorId: resolved.homeSectorId,
          dueDate,
          creatorId: ctx.id,
          // Propiedad de edición (FR-401): origen según contexto de creación.
          originType: input.contextWorkId ? "WORK" : "SECTOR",
          originSectorId: input.contextWorkId ? null : (input.contextSectorId ?? null),
          links: { create: linksData },
          labels: { create: labelsData },
          position: await nextPosition(resolved.workId, resolved.homeSectorId),
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
