import { isContainerTask } from "@/lib/domain/tasks/unfinishedCount";

/**
 * 062-subtareas (hallazgo Importante 2 de revisión): progreso de una columna
 * del tablero — una tarjeta contenedora (`subtaskCount > 0`) no suma; su
 * estado es un espejo del de sus hijas. Si esas hijas también son tarjetas
 * propias en la misma columna (tienen su propio vínculo EXEC a este sector),
 * ya cuentan solas; si no, simplemente no aportan acá. Mismo criterio que
 * `/api/sectors` (ver src/app/api/sectors/route.ts), extraído a función pura
 * para poder testearlo sin renderizar el componente (que tiene estado/efectos
 * y no se presta al patrón `renderToString` del resto de los tests .tsx).
 */
export function columnProgress(
  tasks: readonly { status: { type: "IN_PROGRESS" | "FINAL" }; subtaskCount: number }[],
): { done: number; total: number } {
  const countable = tasks.filter((t) => !isContainerTask({ subtaskCount: t.subtaskCount }));
  return {
    done: countable.filter((t) => t.status.type === "FINAL").length,
    total: countable.length,
  };
}
