"use client";

import Link from "next/link";
import { Star, MoreHorizontal, Calendar, BookTemplate } from "@/components/ui/icons";
import { Menu } from "@/components/ui/Menu";
import { progress } from "@/lib/domain/works/progress";
import { getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";
import { getProjectColor } from "@/lib/domain/works/projectColor";

export interface DashboardWork {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  createdById: string;
  createdAt: string;
  dueDate: string | null;
  sectorIds: string[];
  isFavorite: boolean;
  isTemplate?: boolean;
  _count: { tasks: number };
  taskCounts: { done: number; total: number };
  labels: { keyId: string; keyName: string; isPrimary: boolean; valueId: string; valueName: string; color: string }[];
  stage: { id: string; name: string; color: string | null } | null;
}

const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ProjectCard({
  project,
  onToggleFavorite,
}: {
  project: DashboardWork;
  onToggleFavorite: (workId: string) => void;
}) {
  const color = getProjectColor(project.labels);
  const prog = progress(project.taskCounts.done, project.taskCounts.total);

  const parsedDue = project.dueDate ? new Date(project.dueDate) : null;
  const urgency = parsedDue ? getDueDateUrgency(parsedDue) : null;

  return (
    <Link
      href={`/works/${project.id}`}
      className="project-card"
    >
      {/* Row 1: pill nombre + star + menu */}
      <div className="card-header">
        <span
          className={`pc-name-pill ${color ? "color-chip" : "pc-name-pill-default"}`}
          style={color ? ({ "--c": color, color: "var(--text)" } as React.CSSProperties) : undefined}
        >
          {project.name.toUpperCase()}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {project.isTemplate && (
            <span className="pc-template-badge" title="Plantilla" aria-label="Plantilla">
              <BookTemplate size={14} />
            </span>
          )}
          <button
            type="button"
            className={`favorite-btn ${project.isFavorite ? "active" : ""}`}
            aria-label={project.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
            aria-pressed={project.isFavorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(project.id);
            }}
          >
            <Star size={18} fill={project.isFavorite ? "currentColor" : "none"} />
          </button>
          <span onClick={(e) => e.preventDefault()}>
            <Menu
              label="Acciones del proyecto"
              trigger={<MoreHorizontal size={18} />}
              items={[
                {
                  label: "Abrir proyecto",
                  onSelect: () => {
                    window.location.href = `/works/${project.id}`;
                  },
                },
                {
                  label: "Archivar",
                  onSelect: () => {},
                  disabled: true,
                },
              ]}
            />
          </span>
        </div>
      </div>

      {/* Row 2: grupo */}
      <div className="pc-group">{project.group ? `Grupo ${project.group.name}` : "Personal"}</div>

      {/* Row 3: etiquetas */}
      {project.labels.length > 0 && (
        <div className="pc-labels">
          {project.labels.map((l) => (
            <span
              key={`${l.keyId}-${l.valueId}`}
              className="label-chip color-chip"
              style={{ "--c": l.color } as React.CSSProperties}
            >
              {l.valueName}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: barra de progreso */}
      {prog && (
        <div className="pc-progress">
          <div
            role="progressbar"
            aria-valuenow={prog.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso: ${prog.pct}%`}
            className="pc-progress-track"
          >
            <div className="pc-progress-fill" style={{ width: `${prog.pct}%` }} />
          </div>
          <span className="pc-progress-pct">{prog.pct}%</span>
        </div>
      )}

      {/* Row 4b: contador de tareas */}
      {project.taskCounts.total > 0 && (
        <span className="pc-task-count">
          {project.taskCounts.done}/{project.taskCounts.total}
        </span>
      )}

      {/* Row 5: fecha de entrega */}
      {parsedDue && urgency && (
        <div className="pc-due">
          <span className="pc-due-date">
            <Calendar size={14} />
            Entrega: {dueDateFormatter.format(parsedDue)}
          </span>
          <span className={`pc-due-remaining due-${urgency.color}`} style={{ fontStyle: "italic" }}>
            {urgency.label}
          </span>
        </div>
      )}
    </Link>
  );
}
