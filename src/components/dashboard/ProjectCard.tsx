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
  groupName: string | null;
  group: { id: string; name: string } | null;
  createdById: string;
  createdAt: string;
  dueDate: string | null;
  sectorIds: string[];
  isFavorite: boolean;
  isTemplate?: boolean;
  // 062-subtareas: `_count.tasks` (relation count crudo, sin regla de
  // contenedor) sacado — la API ya no lo manda (ver src/app/api/works/route.ts)
  // y nada de este componente lo leía; `taskCounts.total` es la fuente única.
  taskCounts: { done: number; total: number };
  labels: {
    keyId: string;
    keyName: string;
    isPrimary: boolean;
    valueId: string;
    valueName: string;
    color: string;
  }[];
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
    <div className="project-card">
      {/* Link "estirado" a toda la card (patrón stretched-link): así el resto
          del contenido puede seguir teniendo botones propios (favorito, menú)
          sin anidar controles interactivos dentro de un <a>, que es HTML
          inválido y rompe el foco/tab. */}
      <Link href={`/works/${project.id}`} className="project-card-link" aria-label={project.name} />

      {/* Row 1: pill nombre + star + menu */}
      <div className="card-header">
        <span
          title={project.name}
          className={`pc-name-pill ${color ? "color-chip" : "pc-name-pill-default"}`}
          style={
            color ? ({ "--c": color, color: "var(--text)" } as React.CSSProperties) : undefined
          }
        >
          {project.name.toUpperCase()}
        </span>
        <div className="project-card-actions">
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
            onClick={() => onToggleFavorite(project.id)}
          >
            <Star size={18} fill={project.isFavorite ? "currentColor" : "none"} />
          </button>
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
      <div className="pc-card-footer">
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
        <span className="pc-task-count">
          {project.taskCounts.total > 0
            ? `${project.taskCounts.done}/${project.taskCounts.total} tareas`
            : "Sin tareas todavía"}
        </span>
      </div>
    </div>
  );
}
