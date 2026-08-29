import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { accessSector } from "@/lib/domain/permissions";
import { applyTaskFilters, type TaskFilters } from "@/lib/domain/views/filters";
import { loadApplicableStatusSet, execSectorIdsOf, statusOptionDto } from "@/server/tasks";
import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

// 062-subtareas: shape base compartida por padre e hija (una subtarea no puede
// tener sus propias subtareas, así que solo hace falta un nivel de `include`).
const taskInclude = {
  links: { include: { sector: true, user: { select: { id: true, name: true } } } },
  work: { select: { id: true, name: true, status: true, groupId: true, group: { select: { id: true, name: true } } } },
  homeSector: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
  labels: { include: { value: { include: { key: true } } } },
  status: true,
  parent: { select: { id: true, displayText: true } },
} as const;

/** Include del padre: agrega la relación `subtasks` (un solo nivel). */
const rootTaskInclude = {
  ...taskInclude,
  subtasks: { include: taskInclude, orderBy: { position: "asc" } },
} as const;

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
 * works/[id]) y agrega `parentText`/`subtaskCount`/`subtaskDone`. Recursivo
 * (062-subtareas): cada hija de `subtasks` pasa por el MISMO aplanado.
 */
function withFlatLabels<
  T extends {
    labels: { keyId: string; valueId: string; value: { name: string; color: string; key: { name: string } } }[];
    parent?: { id: string; displayText: string } | null;
    subtasks?: unknown[];
    status: { type: "IN_PROGRESS" | "FINAL" };
  },
>(
  task: T,
): Omit<T, "labels" | "parent" | "subtasks"> & {
  parentText: string | null;
  labels: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  subtasks: unknown[];
  subtaskCount: number;
  subtaskDone: number;
} {
  const { labels, parent, subtasks: rawSubtasks, ...rest } = task;
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

  // 062-subtareas: `parentId: null` en las tres consultas raíz — las hijas
  // viajan anidadas bajo su padre (subtasks), no sueltas en exec/refs/loose.
  const [execLinks, refLinks, loose] = await Promise.all([
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "EXEC",
        task: {
          OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }],
          parentId: null,
          ...labelWhere,
        },
      },
      include: { task: { include: rootTaskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.taskLink.findMany({
      where: {
        sectorId: id,
        type: "REF",
        task: {
          OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }],
          parentId: null,
          ...labelWhere,
        },
      },
      include: { task: { include: rootTaskInclude } },
      orderBy: { task: { position: "asc" } },
    }),
    prisma.task.findMany({
      where: {
        sectorId: id,
        OR: [{ work: { isTemplate: false } }, { workId: null }],
        parentId: null,
        ...labelWhere,
      },
      include: rootTaskInclude,
      orderBy: { position: "asc" },
    }),
  ]);

  const dedupe = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  };

  const allExec = await withStatusOptions(
    applyTaskFilters(dedupe([...execLinks.map((l) => l.task), ...loose]), filters),
  );
  const execIds = new Set(allExec.map((t) => t.id));
  const refs = await withStatusOptions(
    applyTaskFilters(
      dedupe(refLinks.map((l) => l.task)).filter((t) => !execIds.has(t.id)),
      filters,
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

  // 062-subtareas: `allExec` ya viene filtrado a `parentId: null` (containers +
  // sueltas); un contenedor no suma nada — sus hijas (`t.subtasks`, ya anidadas)
  // aportan en su lugar (ver unfinishedCount.ts). Cast acotado: `withStatusOptions`
  // devuelve `subtasks` como `unknown[]` porque su firma es genérica, pero acá
  // sabemos que cada elemento vino de `rootTaskInclude` (status.type incluido).
  let totalCount = 0;
  let doneCount = 0;
  for (const t of allExec) {
    const subtasks = (t.subtasks ?? []) as { status: { type: "IN_PROGRESS" | "FINAL" } }[];
    if (isContainerTask({ subtaskCount: subtasks.length })) {
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
