import { progress } from "@/lib/domain/works/progress";

/**
 * Barra de progreso de un proyecto (FR-407): % de tareas realizadas sobre el total.
 * Sin tareas (total=0) no renderiza nada. Puro/presentacional (server-safe).
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

  return (
    <div className={`progress-bar progress-bar-${size}`}>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={result.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="progress-track"
      >
        <div className="progress-fill" style={{ width: `${result.pct}%` }} />
      </div>
      <span className="progress-label">
        {result.label} · {result.pct}%
      </span>
    </div>
  );
}
