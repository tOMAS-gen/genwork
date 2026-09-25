/**
 * objetivos: clonado de un árbol de tareas pendientes (plantilla → objetivo,
 * plantilla → plantilla, objetivo → plantilla). Todo corre dentro de una
 * transacción Prisma existente (no crea la suya).
 *
 * Reemplaza a `cloneTasksFromTemplate` (feature 042), que copiaba las tareas
 * planas por `createdAt`, perdía las subtareas, conservaba el `/proyecto` del
 * texto (la copia se mudaba al proyecto de origen al editarla) y copiaba
 * vínculos hacia sectores de otros grupos (crítica I2).
 */

import type { Objective, Prisma, Task } from "@prisma/client";
import { parseTags } from "@/lib/domain/tags/parser";
import { parseDates } from "@/lib/domain/dates/parser";
import { stripWorkTags } from "@/lib/domain/tags/stripWorkTags";
import { isTaskLabelKeyAvailable } from "@/lib/domain/labels/availability";
import { initialStatus, type TaskStatusRef } from "@/lib/domain/tasks/statusResolution";
import { execSectorIdsOf, loadApplicableStatusSet, nextPosition } from "@/server/tasks";

type TxClient = Prisma.TransactionClient;

/** Roles a los que se puede referenciar con `@usuario` (misma allowlist que `resolveTask`). */
const REFERABLE_USER_ROLES = new Set(["SUPERADMIN", "MEMBER"]);

export interface CloneTaskTreeArgs {
  /**
   * Origen: las raíces que cumplen este filtro, con sus subtareas. Por
   * ejemplo `{ workId: templateId }` o `{ objectiveId }`. Cada hija se
   * atribuye a la sección de su RAÍZ (crítica B4), así que una hija con un
   * `objectiveId` roto no se cuela ni se pierde.
   */
  sourceWhere: Prisma.TaskWhereInput;
  destWorkId: string;
  /** Sección destino de raíces e hijas (`null` = tareas generales). */
  destObjectiveId: string | null;
  /** Quien copia: creador de las copias, autor del historial y dueño de "personal". */
  actorId: string;
}

export interface CloneTaskTreeResult {
  /** Tareas creadas: primero las raíces (en orden), después las hijas. */
  tasks: Task[];
  /** Cantidad de tareas copiadas (raíces + hijas); es el `copiedTasks` de los contratos. */
  copiedTasks: number;
}

/**
 * Copia las tareas IN_PROGRESS del origen (con sus subtareas) al proyecto y
 * sección destino. Reglas (plan §3, crítica I2):
 *
 * - Solo IN_PROGRESS, en orden de `position` (desempata `createdAt`).
 * - Conserva las subtareas con un mapa id viejo → id nuevo. Una hija
 *   pendiente cuyo padre estaba terminado (no se copia) sube a raíz y va al
 *   final de las raíces.
 * - Posiciones densas: raíces desde el final de la sección destino (en un
 *   destino vacío, 0..n-1) e hijas 0..k-1 dentro de su padre.
 * - `rawText` sin tags `/proyecto` (`stripWorkTags`); si el texto cambió se
 *   recalcula `displayText`. `dueDate` sale de `parseDates` del texto, como en
 *   `saveTask`.
 * - Vínculos a sector solo si el sector es del grupo del destino, personal
 *   del actor o global (la prioridad de `findSector` en `resolveTask`); REF a
 *   usuario solo si es MEMBER o SUPERADMIN. Los demás (y los de destinos que
 *   ya no existen) se omiten sin error: el `#`/`@` queda en `rawText` y
 *   editar la copia da 409 hasta corregirlo (documentado en la crítica I2).
 * - Etiquetas solo si su clave está disponible en el destino
 *   (`isTaskLabelKeyAvailable`).
 * - Estado inicial del conjunto aplicable al destino (memoizado por
 *   combinación de sectores EXEC) y `TaskStatusChange` inicial de cada copia.
 * - `sectorId: null`: una tarea con proyecto no tiene sector propio.
 */
export async function cloneTaskTree(
  tx: TxClient,
  { sourceWhere, destWorkId, destObjectiveId, actorId }: CloneTaskTreeArgs,
): Promise<CloneTaskTreeResult> {
  const source = await tx.task.findMany({
    where: {
      status: { type: "IN_PROGRESS" },
      OR: [{ ...sourceWhere, parentId: null }, { parent: sourceWhere }],
    },
    include: {
      links: true,
      labels: { select: { keyId: true, valueId: true, key: { select: { groupId: true, ownerId: true } } } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  if (source.length === 0) return { tasks: [], copiedTasks: 0 };

  // Raíces, huérfanas (hija cuyo padre no se copia) e hijas por padre, en el
  // orden de la consulta.
  const copiedIds = new Set(source.map((t) => t.id));
  const roots = source.filter((t) => t.parentId === null);
  const orphans = source.filter((t) => t.parentId !== null && !copiedIds.has(t.parentId));
  const childrenByParent = new Map<string, typeof source>();
  for (const t of source) {
    if (t.parentId === null || !copiedIds.has(t.parentId)) continue;
    const list = childrenByParent.get(t.parentId) ?? [];
    list.push(t);
    childrenByParent.set(t.parentId, list);
  }

  const destWork = await tx.work.findUniqueOrThrow({
    where: { id: destWorkId },
    select: { groupId: true, ownerId: true },
  });

  // Destinos de los vínculos en dos consultas en lote (antes: un findUnique por vínculo).
  const linkSectorIds = new Set<string>();
  const linkUserIds = new Set<string>();
  for (const t of source) {
    for (const l of t.links) {
      if (l.targetType === "SECTOR") linkSectorIds.add(l.targetId);
      else linkUserIds.add(l.targetId);
    }
  }
  const [sectors, users] = await Promise.all([
    linkSectorIds.size > 0
      ? tx.sector.findMany({
          where: { id: { in: [...linkSectorIds] } },
          select: { id: true, groupId: true, ownerId: true },
        })
      : [],
    linkUserIds.size > 0
      ? tx.user.findMany({ where: { id: { in: [...linkUserIds] } }, select: { id: true, globalRole: true } })
      : [],
  ]);
  const allowedSectorIds = new Set(
    sectors
      .filter(
        (s) =>
          (s.groupId !== null && s.groupId === destWork.groupId) ||
          s.ownerId === actorId ||
          (s.groupId === null && s.ownerId === null),
      )
      .map((s) => s.id),
  );
  const allowedUserIds = new Set(users.filter((u) => REFERABLE_USER_ROLES.has(u.globalRole)).map((u) => u.id));

  // Conjunto de estados del destino por combinación de sectores EXEC: una
  // plantilla grande resuelve cada combinación una sola vez.
  const statusSets = new Map<string, Promise<TaskStatusRef[]>>();
  const statusSetFor = (execIds: string[]) => {
    const key = [...execIds].sort().join(",");
    let set = statusSets.get(key);
    if (!set) {
      set = loadApplicableStatusSet(destWorkId, null, execIds, tx);
      statusSets.set(key, set);
    }
    return set;
  };

  const copyOne = async (src: (typeof source)[number], parentId: string | null, position: number) => {
    const rawText = stripWorkTags(src.rawText);
    const displayText = rawText === src.rawText ? src.displayText : parseTags(rawText).displayText;
    const dueIso = parseDates(rawText)[0]?.iso;

    const links = src.links
      .filter((l) =>
        l.targetType === "SECTOR" ? allowedSectorIds.has(l.targetId) : allowedUserIds.has(l.targetId),
      )
      .map((l) => ({
        type: l.type,
        targetType: l.targetType,
        targetId: l.targetId,
        sectorId: l.targetType === "SECTOR" ? l.targetId : null,
        userId: l.targetType === "USER" ? l.targetId : null,
      }));
    const labels = src.labels
      .filter((l) => isTaskLabelKeyAvailable(l.key, destWork))
      .map((l) => ({ keyId: l.keyId, valueId: l.valueId }));

    const applicable = await statusSetFor(execSectorIdsOf(links));

    return tx.task.create({
      data: {
        rawText,
        displayText,
        description: src.description,
        dueDate: dueIso ? new Date(dueIso) : null,
        statusId: initialStatus(applicable).id,
        workId: destWorkId,
        objectiveId: destObjectiveId,
        sectorId: null,
        originType: "WORK",
        creatorId: actorId,
        parentId,
        position,
        links: { create: links },
        labels: { create: labels },
      },
    });
  };

  const created: Task[] = [];
  const newIdByOldId = new Map<string, string>();

  const base = await nextPosition(destWorkId, null, null, destObjectiveId, tx);
  const rootOrder = [...roots, ...orphans];
  for (const [i, src] of rootOrder.entries()) {
    const copy = await copyOne(src, null, base + i);
    newIdByOldId.set(src.id, copy.id);
    created.push(copy);
  }
  for (const root of roots) {
    const children = childrenByParent.get(root.id) ?? [];
    const newParentId = newIdByOldId.get(root.id)!;
    for (const [i, child] of children.entries()) {
      created.push(await copyOne(child, newParentId, i));
    }
  }

  await tx.taskStatusChange.createMany({
    data: created.map((t) => ({
      taskId: t.id,
      fromStatusId: null,
      toStatusId: t.statusId,
      changedById: actorId,
    })),
  });

  return { tasks: created, copiedTasks: created.length };
}

/** objetivos: posición de un objetivo nuevo, al final de los del proyecto. */
export async function nextObjectivePosition(db: TxClient, workId: string): Promise<number> {
  const result = await db.objective.aggregate({ where: { workId }, _max: { position: true } });
  return (result._max.position ?? -1) + 1;
}

export interface InsertTemplateAsObjectiveArgs {
  /** Proyecto destino, ya validado por el llamador (operar, no plantilla). */
  workId: string;
  /** Plantilla de origen, ya validada por el llamador (lectura, plantilla activa). */
  template: { id: string; name: string; description: string | null };
  /** Título del objetivo; vacío o ausente → nombre de la plantilla. */
  title?: string | null;
  actorId: string;
}

/**
 * objetivos: inserta una plantilla como UN objetivo del proyecto (D3/D5):
 * crea el `Objective` al final (título = `title` o el nombre de la plantilla,
 * descripción de la plantilla, `sourceTemplateId` informativo) y copia las
 * tareas pendientes de la plantilla adentro. Sin controles de acceso: los
 * hace el llamador (`createWork`, `insertTemplateAsObjective`) antes de abrir
 * la transacción.
 */
export async function insertTemplateAsObjectiveTx(
  tx: TxClient,
  { workId, template, title, actorId }: InsertTemplateAsObjectiveArgs,
): Promise<{ objective: Objective; copiedTasks: number }> {
  const objective = await tx.objective.create({
    data: {
      workId,
      title: title?.trim() || template.name,
      description: template.description || null,
      position: await nextObjectivePosition(tx, workId),
      sourceTemplateId: template.id,
      createdById: actorId,
    },
  });
  const { copiedTasks } = await cloneTaskTree(tx, {
    sourceWhere: { workId: template.id },
    destWorkId: workId,
    destObjectiveId: objective.id,
    actorId,
  });
  return { objective, copiedTasks };
}
