/**
 * Espejo de estado padre ↔ subtareas. La comparación es SIEMPRE por `type`: una
 * hija delegada a otro sector puede tener un conjunto de estados distinto al del
 * padre (feature 042), así que los ids no son comparables entre conjuntos.
 */
import {
  finalStatus,
  initialStatus,
  type TaskStatusRef,
  type TaskStatusTypeValue,
} from "@/lib/domain/tasks/statusResolution";

export interface ChildForMirror {
  status: { type: TaskStatusTypeValue };
}

/**
 * Estado que le corresponde al padre, o `null` si no hay que cambiar nada:
 * - sin hijas → la tarea se comporta como cualquier otra;
 * - todas FINAL y el padre abierto → el FINAL de SU conjunto;
 * - alguna abierta y el padre FINAL → el primer IN_PROGRESS de su conjunto.
 */
export function deriveParentStatusId(
  children: readonly ChildForMirror[],
  parentStatus: { id: string; type: TaskStatusTypeValue },
  applicableSet: readonly TaskStatusRef[],
): string | null {
  if (children.length === 0) return null;

  const allDone = children.every((c) => c.status.type === "FINAL");
  if (allDone && parentStatus.type !== "FINAL") return finalStatus(applicableSet).id;
  if (!allDone && parentStatus.type === "FINAL") return initialStatus(applicableSet).id;
  return null;
}
