import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";
import { applyTaskFilters, type TaskFilters } from "@/lib/domain/views/filters";
import { loadApplicableStatusSet, execSectorIdsOf, statusOptionDto } from "@/server/tasks";
import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

// 062-subtareas: shape de cada fila; `_count.subtasks` es el conteo GLOBAL de
// hijas (todas, sin importar a qué sector estén vinculadas) — sirve para saber
// si la tarea es contenedora en cualquier vista, no solo en esta. `subtasks`
// (la anidación visible en ESTA página) se arma aparte, ver `nestByParent`.
const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true, status: true, groupId: true, group: { select: { id: true, name: true } } } },
  homeSector: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
  labels: { include: { value: { include: { key: true } } } },
  status: true,
  parent: { select: { id: true, displayText: true } },
  _count: { select: { subtasks: true } },
} as const;

/**
 * Agrupa un listado plano por padre — SOLO cuando el padre también está en el
 * MISMO listado (ruling 2026-08-29 sobre Tarea 11): una hija delegada a este
 * sector por vínculo propio (EXEC o REF) cuenta acá aunque su padre viva en
 * otro sector (spec, "consecuencia a aceptar"); si no se lista en algún lado
 * queda un pendiente que nadie puede encontrar ni completar (Principio I).
 *
 * - Si el padre de una tarea está en `tasks`, la tarea se saca del nivel raíz
 *   y se cuelga de `padre.subtasks` (no se repite suelta).
 * - Si el padre NO está en `tasks` (delegación a otro sector, o el padre
 *   pertenece a un proyecto y no tiene vínculo propio con ningún sector), la
 *   tarea queda plana en el nivel raíz — su propio `parent` (ya incluido en
 *   `taskInclude`) arma el `parentText` de la migaja en `withFlatLabels`.
 */
function nestByParent<T extends { id: string; parentId: string | null }>(
  tasks: T[],
): (T & { subtasks: T[] })[] {
  const idsInView = new Set(tasks.map((t) => t.id));
  const childrenByParentId = new Map<string, T[]>();
  for (const t of tasks) {
    if (t.parentId && idsInView.has(t.parentId)) {
      const siblings = childrenByParentId.get(t.parentId) ?? [];
      siblings.push(t);
      childrenByParentId.set(t.parentId, siblings);
    }
  }
  return tasks
    .filter((t) => !(t.parentId && idsInView.has(t.parentId))) // nivel raíz: sin padre visible acá
    .map((t) => ({ ...t, subtasks: childrenByParentId.get(t.id) ?? [] }));
}

/**
 * Adjunta el conjunto de estados aplicable (selector de estado en la UI, FR-011).
 * Recursivo (062-subtareas): si la tarea trae `subtasks`, cada hija pasa por el
 * MISMO cálculo — es el mismo mapper que el padre, para que `TaskItem` las
 * renderice igual.
 */
async function withStatusOptions<
  T extends {
    workId: string | null;
    sectorId: string | null;
    links: { type: string; sectorId: string | null }[];
    subtasks?: unknown[];
  },
>(tasks: T[]): Promise<(T & { statusOptions: ReturnType<typeof statusOptionDto>[] })[]> {
  return Promise.all(
    tasks.map(async (t) => {
      const statusOptions = (await loadApplicableStatusSet(t.workId, t.sectorId, execSectorIdsOf(t.links))).map(
        statusOptionDto,
      );
      const subtasks = t.subtasks
        ? await withStatusOptions(t.subtasks as unknown as T[])
        : undefined;
      return { ...t, statusOptions, ...(subtasks ? { subtasks } : {}) };
    }),
  );
}

/**
 * Aplana el include crudo de `labels` al shape del contrato (análogo a
 * works/[id]), agrega `parentText` y descarta el `_count` interno (solo sirve
 * para el cálculo de `metrics`, no es parte del contrato). Recursivo
 * (062-subtareas): cada hija de `subtasks` pasa por el MISMO aplanado.
 */
function withFlatLabels<
  T extends {
    labels: { keyId: string; valueId: string; value: { name: string; color: string; key: { name: string } } }[];
    parent?: { id: string; displayText: string } | null;
    subtasks?: unknown[];
    status: { type: "IN_PROGRESS" | "FINAL" };
    _count?: { subtasks: number };
  },
>(
  task: T,
): Omit<T, "labels" | "parent" | "subtasks" | "_count"> & {
  parentText: string | null;
  labels: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  subtasks: unknown[];
  subtaskCount: number;
  subtaskDone: number;
} {
  const { labels, parent, subtasks: rawSubtasks, _count, ...rest } = task;
  const subtasks: { status: { type: "IN_PROGRESS" | "FINAL" } }[] = rawSubtasks
    ? (rawSubtasks as T[]).map((s) => withFlatLabels(s))
    : [];
  return {
    ...rest,
    parentText: parent?.displayText ?? null,
    labels: labels.map((l) => ({
      keyId: l.keyId,
      keyName: l.value.key.name,
      valueId: l.valueId,
      valueName: l.value.name,
      color: l.value.color,
    })),
    subtasks,
    subtaskCount: subtasks.length,
    subtaskDone: subtasks.filter((s) => s.status.type === "FINAL").length,
  };
}

/**
 * Vista de sector (FR-010/011): `exec` = tareas que se ejecutan acá (completables);
 * `refs` = apartado de referencias (FR-040, solo lectura). Filtros combinables (FR-013).
 */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireInternal();
  const { id } = await params;

  const sector = await prisma.sector.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
  });
  if (!sector) throw notFound();

  const ctx = await getUserContext(session.user.id);
  const level = accessSector(ctx, {
    id: sector.id,
    groupId: sector.groupId,
    ownerId: sector.ownerId,
    groupPublicRead: sector.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();

  const url = new URL(req.url);
  const filters: TaskFilters = {
    workId: url.searchParams.get("workId"),
    refSectorId: url.searchParams.get("refSectorId"),
    statusId: url.searchParams.get("statusId"),
    statusType: (url.searchParams.get("statusType") as TaskFilters["statusType"]) ?? null,
  };
  const labelValueId = url.searchParams.get("labelValueId");
  const labelKeyId = url.searchParams.get("labelKeyId");
  const labelWhere = labelValueId
    ? { labels: { some: { valueId: labelValueId, ...(labelKeyId ? { keyId: labelKeyId } : {}) } } }
    : labelKeyId
      ? { labels: { some: { keyId: labelKeyId } } }
      : {};

  // 062-subtareas: SIN filtro de `parentId` acá — una hija vinculada a este
  // sector por sí misma (EXEC o REF) tiene que listarse, tenga o no a su padre
  // en esta misma vista (ver `nestByParent`, ruling 2026-08-29).
  const [execLinks, refLinks, loose] = await Promise.all([
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "EXEC",
        task: { OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }], ...labelWhere },
      },
      include: { task: { include: taskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "REF",
        task: { OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }], ...labelWhere },
      },
      include: { task: { include: taskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.task.findMany({
      where: {
        sectorId: id,
        OR: [{ work: { isTemplate: false } }, { workId: null }],
        ...labelWhere,
      },
      include: taskInclude,
      orderBy: { position: "asc" },
    }),
  ]);

  const dedupe = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  };

  // Anida DESPUÉS de deduplicar/filtrar (062-subtareas): exec y refs son listas
  // conceptualmente distintas, cada una anida solo dentro de sí misma — una
  // hija EXEC no cuelga de un padre que solo aparece en `refs`, y viceversa.
  const allExec = await withStatusOptions(
    nestByParent(applyTaskFilters(dedupe([...execLinks.map((l) => l.task), ...loose]), filters)),
  );
  const execIds = new Set(allExec.map((t) => t.id));
  const refs = await withStatusOptions(
    nestByParent(
      applyTaskFilters(
        dedupe(refLinks.map((l) => l.task)).filter((t) => !execIds.has(t.id)),
        filters,
      ),
    ),
  );

  // Split exec tasks: loose (no project) vs grouped by work
  const looseExec = allExec.filter((t) => t.workId === null);
  const byWorkMap = new Map<
    string,
    {
      work: { id: string; name: string; status: string; group: { id: string; name: string } | null };
      tasks: typeof allExec;
    }
  >();
  for (const t of allExec) {
    if (t.workId === null || !t.work) continue;
    let entry = byWorkMap.get(t.workId);
    if (!entry) {
      entry = {
        work: {
          id: t.work.id,
          name: t.work.name,
          status: t.work.status,
          group: t.work.group ? { id: t.work.group.id, name: t.work.group.name } : null,
        },
        tasks: [],
      };
      byWorkMap.set(t.workId, entry);
    }
    entry.tasks.push(t);
  }
  const byWork = [...byWorkMap.values()].sort((a, b) => a.work.name.localeCompare(b.work.name));

  // 062-subtareas: `allExec` son los ítems de nivel raíz de ESTA vista (un
  // contenedor con hijas visibles acá, una hoja suelta, o una hija delegada sin
  // su padre a la vista). La contenedora se decide con `_count.subtasks`
  // GLOBAL (todas las hijas, en cualquier sector) — no con las hijas
  // localmente visibles: una tarea puede aparecer acá vía su propio vínculo
  // EXEC sin que ninguna de sus hijas esté vinculada a este mismo sector, y
  // aun así sigue siendo un contenedor en cualquier otro lado (no debe contar
  // acá tampoco, o se duplicaría con el sector donde sí se ven sus hijas).
  // Si es contenedora, no suma ella — suman las hijas visibles en ESTA vista
  // (`t.subtasks`, ya anidadas por `nestByParent`).
  let totalCount = 0;
  let doneCount = 0;
  for (const t of allExec) {
    if (isContainerTask({ subtaskCount: t._count.subtasks })) {
      const subtasks = t.subtasks as { status: { type: "IN_PROGRESS" | "FINAL" } }[];
      totalCount += subtasks.length;
      doneCount += subtasks.filter((s) => s.status.type === "FINAL").length;
    } else {
      totalCount += 1;
      if (t.status.type === "FINAL") doneCount += 1;
    }
  }

  return NextResponse.json({
    sector: {
      id: sector.id,
      name: sector.name,
      color: sector.color,
      scope: sector.groupId
        ? { type: "GROUP", groupId: sector.groupId, groupName: sector.group?.name }
        : sector.ownerId
          ? { type: "PERSONAL", ownerId: sector.ownerId }
          : { type: "GLOBAL" },
    },
    level,
    loose: looseExec.map(withFlatLabels),
    byWork: byWork.map((entry) => ({ ...entry, tasks: entry.tasks.map(withFlatLabels) })),
    refs: refs.map(withFlatLabels),
    metrics: { total: totalCount, done: doneCount },
  });
});
