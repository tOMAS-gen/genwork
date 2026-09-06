import { columnProgress } from "./columnProgress";

export interface BoardTask {
  id: string;
  text: string;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  workName: string | null;
  workColor: string | null;
  parentId: string | null;
  parentText: string | null;
  subtaskCount: number;
  subtaskDone: number;
}

export interface BoardColumn {
  sector: { id: string; name: string; color: string | null };
  tasks: BoardTask[];
}

export function taskIsDone(task: BoardTask) {
  return task.subtaskCount > 0
    ? task.subtaskDone === task.subtaskCount
    : task.status.type === "FINAL";
}

/** A task linked to multiple sectors counts only once in the page summary. */
export function boardProgress(board: BoardColumn[]) {
  return columnProgress([
    ...new Map(board.flatMap((column) => column.tasks).map((task) => [task.id, task])).values(),
  ]);
}
