import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export interface SectorCardData {
  id: string;
  name: string;
  color: string | null;
  scope: {
    type: "GROUP" | "PERSONAL" | "GLOBAL";
    groupId?: string;
    groupName?: string;
    ownerId?: string;
  };
  metrics: { total: number; done: number; pending: number };
}

export function SectorCard({ sector }: { sector: SectorCardData }) {
  const { metrics } = sector;
  const pct = metrics.total > 0 ? Math.round((metrics.done / metrics.total) * 100) : 0;

  return (
    <Link href={`/sectors/${sector.id}`} className="project-card sector-card">
      <div className="card-header">
        <span
          title={sector.name}
          className={`pc-name-pill text-text ${sector.color ? "" : "bg-[var(--hover-soft)]"}`}
          style={
            sector.color
              ? ({
                  "--c": sector.color,
                  background: "color-mix(in srgb, var(--c) 14%, var(--surface))",
                } as React.CSSProperties)
              : undefined
          }
        >
          {sector.name.toUpperCase()}
        </span>
        <Badge
          count={metrics.pending}
          ariaLabelSingular={`tarea pendiente en ${sector.name}`}
          ariaLabelPlural={`tareas pendientes en ${sector.name}`}
        />
      </div>
      <div className="pc-card-footer">
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
        <span className="pc-task-count">
          {metrics.total > 0 ? `${metrics.done}/${metrics.total} tareas` : "Sin tareas todavía"}
        </span>
      </div>
    </Link>
  );
}
