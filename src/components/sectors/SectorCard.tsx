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
    <Link
      href={`/sectors/${sector.id}`}
      className="flex min-w-[340px] flex-col gap-3 rounded-xl border border-border bg-surface p-6 transition-[box-shadow,border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent hover:[box-shadow:var(--shadow-md)]"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3.5 py-1 text-sm font-semibold tracking-[0.03em] text-text ${
            sector.color ? "" : "bg-[var(--hover-soft)]"
          }`}
          style={
            sector.color
              ? ({ "--c": sector.color, background: "color-mix(in srgb, var(--c) 14%, var(--surface))" } as React.CSSProperties)
              : undefined
          }
        >
          {sector.name.toUpperCase()}
        </span>
        {/* feature 060: el ámbito ya lo dice el encabezado de la sección, así
            que este lugar pasa a mostrar lo que sirve para decidir: cuánto falta. */}
        <Badge
          count={metrics.pending}
          ariaLabelSingular={`tarea pendiente en ${sector.name}`}
          ariaLabelPlural={`tareas pendientes en ${sector.name}`}
        />
      </div>

      {metrics.total > 0 ? (
        <>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso: ${pct}%`}
              className="h-2 flex-1 overflow-hidden rounded-full bg-border"
            >
              <div className="h-full rounded-full bg-ok transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-muted">{pct}%</span>
          </div>

          <span className="-mt-1 text-xs text-muted">
            {metrics.done}/{metrics.total}
          </span>
        </>
      ) : (
        <span className="-mt-1 text-xs italic text-muted">Sin tareas todavía</span>
      )}
    </Link>
  );
}
