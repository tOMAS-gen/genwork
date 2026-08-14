"use client";

import { ArrowRight, History } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PortalActivityEntry } from "./types";

/**
 * Historial de cambios de estado del proyecto (feature 059, US4).
 *
 * No es WorkActivityFeed: aquel muestra actividad de asistentes MCP, que para un
 * cliente son nombres de herramientas sin significado. Acá "actividad" es lo que
 * responde la pregunta real: qué tarea avanzó y cuándo.
 */

const stampFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function StatusChip({ status }: { status: { name: string; color: string } | null }) {
  if (!status) return <span className="portal-activity-status-empty">sin estado</span>;
  return (
    <span
      className="label-chip color-chip"
      style={{ "--c": status.color } as React.CSSProperties}
    >
      {status.name}
    </span>
  );
}

export function PortalActivityFeed({ entries }: { entries: PortalActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Todavía no hay movimientos"
        description="Acá vas a ver cada vez que una tarea cambie de estado."
      />
    );
  }

  return (
    <ol className="portal-activity">
      {entries.map((entry) => (
        <li key={entry.id} className="portal-activity-item">
          <p className="portal-activity-task">{entry.taskText}</p>
          <p className="portal-activity-change">
            <StatusChip status={entry.from} />
            <ArrowRight size={14} aria-label="pasó a" />
            <StatusChip status={entry.to} />
          </p>
          <time className="portal-activity-stamp" dateTime={entry.at}>
            {stampFormatter.format(new Date(entry.at))}
          </time>
        </li>
      ))}
    </ol>
  );
}
