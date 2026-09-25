import { ProgressBar } from "@/components/works/ProgressBar";
import { Check } from "@/components/ui/icons";
import { isObjectiveComplete } from "@/lib/domain/objectives/progress";
import { PortalTaskItem } from "./PortalTaskItem";
import type { PortalObjective } from "./types";

/**
 * objetivos (D11): un objetivo en el portal de cliente — título, descripción,
 * progreso (X/Y + barra) y sus tareas. Solo lectura, igual que el resto del
 * portal: sin botones, sin plegado, sin menú. El progreso llega calculado del
 * servidor con la regla de contenedor (mismo número que ve el equipo).
 */
export function PortalObjectiveSection({ objective }: { objective: PortalObjective }) {
  const headingId = `portal-objetivo-${objective.id}`;
  const complete = isObjectiveComplete(objective.taskCounts);

  return (
    <section className="portal-objective" aria-labelledby={headingId}>
      <div className="portal-objective-header">
        <h2 id={headingId} className="portal-group-title">
          {objective.title}
        </h2>
        {/* "Completo" se nombra, no se comunica solo con el color (Principio V). */}
        {complete && (
          <span
            className="label-chip color-chip portal-objective-complete"
            style={{ "--c": "var(--ok)" } as React.CSSProperties}
          >
            <Check size={12} aria-hidden="true" />
            Completo
          </span>
        )}
      </div>

      {objective.description && <p className="portal-objective-description">{objective.description}</p>}

      <ProgressBar done={objective.taskCounts.done} total={objective.taskCounts.total} size="sm" />

      {objective.tasks.length === 0 ? (
        <p className="portal-objective-empty">Todavía no hay tareas en este objetivo.</p>
      ) : (
        <ul className="task-list portal-task-list">
          {objective.tasks.map((task) => (
            <PortalTaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}
