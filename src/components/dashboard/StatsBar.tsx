"use client";

import { getProjectStatus } from "@/lib/domain/works/dashboardUtils";

interface StatsBarProject {
  taskCounts: { done: number; total: number };
}

/** Franja de estadísticas del dashboard: totales por estado de proyecto. */
export function StatsBar({ projects }: { projects: StatsBarProject[] }) {
  const total = projects.length;

  let completed = 0;
  let inProgress = 0;
  let pending = 0;

  for (const p of projects) {
    const status = getProjectStatus(p.taskCounts.done, p.taskCounts.total);
    if (status === "completed") completed++;
    else if (status === "in_progress") inProgress++;
    else pending++;
  }

  const stats = [
    { label: "Total", value: total },
    { label: "En progreso", value: inProgress },
    { label: "Completados", value: completed },
    { label: "Pendientes", value: pending },
  ];

  // Franja de KPI, como la app (spec 066, T42): una card con las cifras en
  // columnas separadas por divisores, sin el porcentaje que repetía la cifra.
  return (
    <div className="stats-strip">
      {stats.map((s) => (
        <div key={s.label} className="stats-strip-item">
          <div className="stat-number">{s.value}</div>
          <div className="stats-strip-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
