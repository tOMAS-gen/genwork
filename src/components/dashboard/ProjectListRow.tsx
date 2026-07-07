"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "@/components/ui/icons";
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
}: {
  project: DashboardWork;
}) {
  const router = useRouter();
  const color = getProjectColor(project.labels);
  const prog = progress(project.taskCounts.done, project.taskCounts.total);
  const status = getProjectStatus(project.taskCounts.done, project.taskCounts.total);
  const parsedDue = project.dueDate ? new Date(project.dueDate) : null;
  const urgency = parsedDue ? getDueDateUrgency(parsedDue) : null;

  return (
    <tr
      onClick={() => router.push(`/works/${project.id}`)}
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
      <td>{project.group ? project.group.name : "Personal"}</td>
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
                onSelect: () => {
                  router.push(`/works/${project.id}`);
                },
              },
            ]}
          />
        </span>
      </td>
    </tr>
  );
}
