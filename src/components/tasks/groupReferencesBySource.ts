import type { TaskDto } from "@/components/tasks/TaskItem";

type GroupInfo = { id: string; name: string } | null;

export type ReferenceGroupHeader =
  | { type: "work"; work: { id: string; name: string; status?: string; group: GroupInfo } }
  | { type: "sector"; sector: { id: string; name: string; group: GroupInfo } };

export interface ReferenceGroup {
  key: string;
  sortName: string;
  header: ReferenceGroupHeader;
  tasks: TaskDto[];
}

function sectorFromTask(task: TaskDto): { id: string; name: string; group: GroupInfo } | null {
  if (task.homeSector) return { id: task.homeSector.id, name: task.homeSector.name, group: task.homeSector.group ?? null };
  const execLink = task.links.find((link) => link.type === "EXEC" && link.targetType === "SECTOR" && link.sector);
  return execLink?.sector
    ? { id: execLink.sector.id, name: execLink.sector.name, group: execLink.sector.group ?? null }
    : null;
}

export function groupReferencesBySource(tasks: TaskDto[]): ReferenceGroup[] {
  const groups = new Map<string, ReferenceGroup>();

  for (const task of tasks) {
    if (task.work) {
      const key = `work:${task.work.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          sortName: task.work.name,
          header: {
            type: "work",
            work: { id: task.work.id, name: task.work.name, status: task.work.status, group: task.work.group ?? null },
          },
          tasks: [],
        });
      }
      groups.get(key)!.tasks.push(task);
      continue;
    }

    const sector = sectorFromTask(task);
    const key = sector ? `sector:${sector.id}` : "sector:sin-origen";
    const fallbackSector = sector ?? { id: "sin-origen", name: "Sin sector", group: null };
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sortName: fallbackSector.name,
        header: { type: "sector", sector: fallbackSector },
        tasks: [],
      });
    }
    groups.get(key)!.tasks.push(task);
  }

  return [...groups.values()].sort((a, b) => a.sortName.localeCompare(b.sortName) || a.key.localeCompare(b.key));
}

export function referenceTaskContext(
  header: ReferenceGroupHeader,
  sectorId: string,
): { sectorId: string; suppressWorkTag?: boolean } {
  if (header.type === "work") return { sectorId, suppressWorkTag: true };
  return { sectorId };
}
