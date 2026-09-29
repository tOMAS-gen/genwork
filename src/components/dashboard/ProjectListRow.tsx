"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Archive, ArchiveRestore, Folder } from "@/components/ui/icons";
import { Menu } from "@/components/ui/Menu";
import { progress } from "@/lib/domain/works/progress";
import { getProjectStatus, getDueDateUrgency } from "@/lib/domain/works/dashboardUtils";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import type { DashboardWork } from "./ProjectCard";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
};

const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ProjectListRow({
  project,
  archived,
  onArchiveToggle,
  onMoveToFolder,
}: {
  project: DashboardWork;
  archived: boolean;
  onArchiveToggle: (project: DashboardWork) => void;
  onMoveToFolder: (project: DashboardWork) => void;
}) {
  const router = useRouter();
  const color = getProjectColor(project.labels);
  const prog = progress(project.taskCounts.done, project.taskCounts.total);
  const status = getProjectStatus(project.taskCounts.done, project.taskCounts.total);
  const parsedDue = project.dueDate ? new Date(project.dueDate) : null;
  const urgency = parsedDue ? getDueDateUrgency(parsedDue) : null;

  const open = () => router.push(`/works/${project.id}`);

  return (
    <tr
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          open();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Abrir proyecto ${project.name}`}
      style={{ cursor: "pointer" }}
    >
      <td>
        <div className="col-project">
          {color && <span className="project-dot color-dot" style={{ "--c": color } as React.CSSProperties} />}
          <div>
            <strong>{project.name}</strong>
            {parsedDue && (
              <div className="muted" style={{ fontSize: "var(--text-sm)" }}>
                Entrega: {new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(parsedDue)}
              </div>
            )}
          </div>
        </div>
      </td>
      <td>
        {project.group ? project.group.name : "Personal"}
        {project.projectFolderName && (
          <div className="project-folder-tag" title={`Carpeta ${project.projectFolderName}`}>
            <Folder size={14} aria-hidden="true" />
            <span>{project.projectFolderName}</span>
          </div>
        )}
      </td>
      <td>
        {(project.labels.length > 0 || project.stage) && (
          <div className="col-labels">
            {project.labels.map((l) => (
              <span key={l.valueId} className="label-chip color-chip" style={{ "--c": l.color } as React.CSSProperties}>
                {l.valueName}
              </span>
            ))}
            {project.stage && (
              <span className="stage-badge" style={{ color: project.stage.color || "var(--muted)" }}>
                <span className="stage-dot" style={{ background: project.stage.color || "var(--muted)" }} />
                {project.stage.name}
              </span>
            )}
          </div>
        )}
      </td>
      <td>
        {prog && (
          <div className="table-progress">
            <span className="table-progress-pct">{prog.pct}%</span>
            <div className="table-progress-track">
              <div className="table-progress-fill" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        )}
      </td>
      <td>{parsedDue ? dueDateFormatter.format(parsedDue) : ""}</td>
      <td>
        {urgency && (
          <span className={`due-${urgency.color}`}>{urgency.label}</span>
        )}
      </td>
      <td>
        <span className={`status-pill status-${status}`}>
          {STATUS_LABELS[status]}
        </span>
      </td>
      <td>
        <span onClick={(e) => e.stopPropagation()}>
          <Menu
            label="Acciones del proyecto"
            trigger={<MoreHorizontal size={16} />}
            items={[
              {
                label: "Abrir proyecto",
                onSelect: open,
              },
              ...(project.isTemplate
                ? []
                : [
                    {
                      label: "Mover a carpeta…",
                      icon: <Folder size={16} />,
                      onSelect: () => onMoveToFolder(project),
                    },
                  ]),
              {
                label: archived ? "Desarchivar" : "Archivar",
                icon: archived ? <ArchiveRestore size={16} /> : <Archive size={16} />,
                onSelect: () => onArchiveToggle(project),
              },
            ]}
          />
        </span>
      </td>
    </tr>
  );
}
