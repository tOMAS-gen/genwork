"use client";

import { getProjectStatus } from "@/lib/domain/works/dashboardUtils";

interface StatsBarProject {
  taskCounts: { done: number; total: number };
}

/** Barra de estadísticas del dashboard: totales y % por estado de proyecto. */
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

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    { label: "Total", value: total, pct: total > 0 ? 100 : 0 },
    { label: "En progreso", value: inProgress, pct: pct(inProgress) },
    { label: "Completados", value: completed, pct: pct(completed) },
    { label: "Pendientes", value: pending, pct: pct(pending) },
  ];

  return (
    <div className="stats-bar">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-number">{s.value}</div>
          <div className="stat-pct">
            {s.label} · {s.pct}%
          </div>
        </div>
      ))}
    </div>
  );
}
