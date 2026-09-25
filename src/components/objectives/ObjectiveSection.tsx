"use client";

import type { ReactNode, Ref } from "react";
import { Badge } from "@/components/ui/Badge";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { CheckCircle, ChevronRight } from "@/components/ui/icons";
import { ProgressBar } from "@/components/works/ProgressBar";
import {
  isObjectiveComplete,
  objectiveTaskCounts,
  type ObjectiveRootTask,
} from "@/lib/domain/objectives/progress";

/**
 * Ancla del objetivo (`#objetivo-<id>`): la usan el chip de las tareas y el
 * efecto de la página que baja hasta la sección después de cargar.
 */
export function objectiveAnchorId(objectiveId: string): string {
  return `objetivo-${objectiveId}`;
}

/** Cuántas tareas se llevaría "Eliminar con sus N tareas": raíces + todas sus hijas. */
export function countObjectiveTasks(roots: readonly { subtaskCount?: number }[]): number {
  return roots.reduce((n, t) => n + 1 + (t.subtaskCount ?? 0), 0);
}

/**
 * objetivos: sección plegable de un objetivo dentro de la lista del proyecto.
 * Solo presentación (sin dnd-kit ni fetch): el orquestador (`ProjectTaskList`)
 * le pasa las filas como `children` y, si arrastra, el `ref` droppable del
 * encabezado.
 *
 * El botón de plegar y las acciones (progreso, pendientes, ⋮) son HERMANOS,
 * patrón `.nav-group`: nunca un botón dentro de otro. El panel queda siempre
 * montado (con `hidden`) para que `aria-controls` apunte a algo que existe.
 */
export function ObjectiveSection({
  objective,
  tasks,
  open,
  onToggle,
  menuItems,
  headerDropRef,
  isDropTarget = false,
  children,
}: {
  objective: { id: string; title: string; description: string | null };
  /** Raíces del objetivo (con `subtaskCount`/`subtaskDone`) para el progreso. */
  tasks: readonly ObjectiveRootTask[];
  open: boolean;
  onToggle: () => void;
  /** Ítems del ⋮; sin ellos (solo lectura) no hay menú. */
  menuItems?: MenuItem[];
  headerDropRef?: Ref<HTMLDivElement>;
  /** Hay una tarea arrastrándose encima del encabezado. */
  isDropTarget?: boolean;
  children?: ReactNode;
}) {
  const anchor = objectiveAnchorId(objective.id);
  const titleId = `${anchor}-titulo`;
  const panelId = `${anchor}-tareas`;
  const counts = objectiveTaskCounts(tasks);
  const complete = isObjectiveComplete(counts);
  const pending = counts.total - counts.done;

  return (
    <section
      id={anchor}
      className={`objective-section${complete ? " is-complete" : ""}${open ? " is-open" : ""}`}
      aria-labelledby={titleId}
    >
      <div
        ref={headerDropRef}
        className={`objective-header${isDropTarget ? " is-drop-target" : ""}`}
      >
        <h3 className="objective-heading">
          <button
            type="button"
            className="objective-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <ChevronRight size={18} className="objective-chev" aria-hidden="true" />
            <span id={titleId} className="objective-title" title={objective.title}>
              {objective.title}
            </span>
            {complete && (
              <span className="objective-complete">
                <CheckCircle size={14} aria-hidden="true" />
                Completo
              </span>
            )}
          </button>
        </h3>
        <div className="objective-progress">
          {counts.total > 0 ? (
            <ProgressBar
              done={counts.done}
              total={counts.total}
              size="sm"
              ariaLabel={`Progreso de ${objective.title}`}
            />
          ) : (
            <span className="objective-empty-label">Sin tareas</span>
          )}
        </div>
        {!complete && (
          <Badge
            count={pending}
            className="objective-pending"
            ariaLabelSingular={`tarea pendiente en ${objective.title}`}
            ariaLabelPlural={`tareas pendientes en ${objective.title}`}
          />
        )}
        {menuItems && menuItems.length > 0 && (
          <Menu label={`Acciones del objetivo "${objective.title}"`} items={menuItems} />
        )}
      </div>
      {open && objective.description && (
        <p className="objective-description">{objective.description}</p>
      )}
      <div id={panelId} className="objective-body" hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}
