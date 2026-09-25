import { EmptyState } from "@/components/ui/EmptyState";
import { Inbox } from "@/components/ui/icons";
import { PortalObjectiveSection } from "./PortalObjectiveSection";
import { PortalTaskItem } from "./PortalTaskItem";
import type { PortalWorkDetail } from "./types";

/**
 * objetivos (D11): pestaña "Tareas" del portal — primero las tareas generales
 * y después un bloque por objetivo, en el orden del proyecto.
 *
 * Presentacional y sin estado (se prueba con `renderToString`). Sin objetivos
 * se ve igual que antes: la lista sola, sin el título "Tareas generales".
 */
export function PortalTaskGroups({ work }: { work: Pick<PortalWorkDetail, "tasks" | "objectives"> }) {
  const hasObjectives = work.objectives.length > 0;

  if (work.tasks.length === 0 && !hasObjectives) {
    return (
      <EmptyState
        icon={Inbox}
        title="El proyecto todavía no tiene tareas"
        description="Cuando se carguen las tareas, vas a poder seguir su avance desde acá."
      />
    );
  }

  const generalList = work.tasks.length > 0 && (
    <ul className="task-list portal-task-list">
      {work.tasks.map((task) => (
        <PortalTaskItem key={task.id} task={task} />
      ))}
    </ul>
  );

  if (!hasObjectives) return generalList;

  return (
    <div className="portal-task-groups">
      {generalList && (
        <section className="portal-objective" aria-labelledby="portal-tareas-generales">
          <h2 id="portal-tareas-generales" className="portal-group-title">
            Tareas generales
          </h2>
          {generalList}
        </section>
      )}
      {work.objectives.map((objective) => (
        <PortalObjectiveSection key={objective.id} objective={objective} />
      ))}
    </div>
  );
}
