import { ProgressBar as GenProgressBar } from "@gen/ui";
import { progress } from "@/lib/domain/works/progress";

/**
 * Barra de progreso de un proyecto (FR-407): % de tareas realizadas sobre el total.
 * Sin tareas (total=0) no renderiza nada. Usa `ProgressBar` de @gen/ui.
 */
export function ProgressBar({
  done,
  total,
  size = "md",
  ariaLabel,
}: {
  done: number;
  total: number;
  size?: "md" | "sm";
  /** Nombre accesible de la barra (objetivos: "Progreso de <objetivo>"). */
  ariaLabel?: string;
}) {
  const result = progress(done, total);
  if (!result) return null;
  return <GenProgressBar value={result.pct} size={size} ariaLabel={ariaLabel} label={`${result.label} · ${result.pct}%`} />;
}
