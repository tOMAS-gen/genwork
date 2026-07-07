import Link from "next/link";

export interface SectorCardData {
  id: string;
  name: string;
  color: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  metrics: { total: number; done: number; pending: number };
}

export function SectorCard({ sector }: { sector: SectorCardData }) {
  const { metrics } = sector;
  const pct = metrics.total > 0 ? Math.round((metrics.done / metrics.total) * 100) : 0;
  const colorClass = sector.color ? "color-chip" : "pc-name-pill-default";

  return (
    <Link href={`/sectors/${sector.id}`} className="project-card">
      <div className="card-header">
        <span
          className={`pc-name-pill ${colorClass}`}
          style={sector.color ? ({ "--c": sector.color, color: "var(--text)" } as React.CSSProperties) : undefined}
        >
          {sector.name.toUpperCase()}
        </span>
      </div>

      <div className="pc-group">{sector.group ? `Grupo ${sector.group.name}` : "Personal"}</div>

      {metrics.total > 0 && (
        <div className="pc-progress">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso: ${pct}%`}
            className="pc-progress-track"
          >
            <div className="pc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pc-progress-pct">{pct}%</span>
        </div>
      )}

      {metrics.total > 0 && (
        <span className="pc-task-count">
          {metrics.done}/{metrics.total}
        </span>
      )}
    </Link>
  );
}
