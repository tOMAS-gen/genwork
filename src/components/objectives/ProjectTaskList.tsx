"use client";

import { useState, type ReactNode } from "react";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckSquare } from "@/components/ui/icons";
import { showToast } from "@/components/ui/Toast";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { SortableTaskRow } from "@/components/tasks/SortableTaskRow";
import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import { moveNeighbor } from "@/lib/domain/objectives/ordering";
import type { DeleteObjectiveMode } from "@/lib/domain/objectives/validation";
import { ObjectiveSection, countObjectiveTasks } from "./ObjectiveSection";
import { buildObjectiveMenuItems } from "./objectiveMenu";
import { EditObjectiveDialog } from "./EditObjectiveDialog";
import { DeleteObjectiveDialog } from "./DeleteObjectiveDialog";
import { sectionDropId, taskSectionCollision, type DropSection } from "./taskDrag";
import { useProjectTaskDnd } from "./useProjectTaskDnd";
import {
  deleteObjective,
  reorderObjectives,
  saveObjectiveAsTemplate,
  updateObjective,
  type ObjectiveDto,
} from "./objectiveApi";

/**
 * Encabezado "Tareas generales": además es destino (`section:general`) para
 * sacar una tarea de un objetivo soltándola ahí.
 */
function GeneralHeading({ droppable }: { droppable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: sectionDropId(null), disabled: !droppable });
  return (
    <h3 ref={setNodeRef} className={`work-section-heading${isOver ? " is-drop-target" : ""}`}>
      Tareas generales
    </h3>
  );
}

/**
 * Hueco de una sección sin tareas (`section:<clave>:empty`): sin él, una
 * sección vacía no tendría dónde recibir una tarea arrastrada.
 */
function EmptySectionDrop({
  objectiveId,
  droppable,
  children,
}: {
  objectiveId: string | null;
  droppable: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDropId(objectiveId, "empty"),
    disabled: !droppable,
  });
  return (
    <div ref={setNodeRef} className={`work-section-empty${isOver ? " is-drop-target" : ""}`}>
      {children}
    </div>
  );
}

/** `ObjectiveSection` con su encabezado como destino (`section:<id>`). */
function DroppableObjectiveSection(
  props: Omit<Parameters<typeof ObjectiveSection>[0], "headerDropRef" | "isDropTarget"> & {
    droppable: boolean;
  },
) {
  const { droppable, ...rest } = props;
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDropId(rest.objective.id),
    disabled: !droppable,
  });
  return <ObjectiveSection {...rest} headerDropRef={setNodeRef} isDropTarget={isOver} />;
}

/**
 * objetivos: lista de tareas del proyecto. Arriba las generales (con el
 * encabezado "Tareas generales" solo si hay objetivos) y debajo una
 * `ObjectiveSection` por objetivo, cada una con su composer.
 *
 * Un solo `DndContext` con un `SortableContext` por sección, así una tarea se
 * puede soltar en otra sección (ver `taskDrag.ts`). Sin objetivos se ve igual
 * que antes. Solo lectura (`!editable`): sin DnD ni composers; plegar sigue.
 */
export function ProjectTaskList({
  workId,
  tasks,
  objectives,
  editable,
  canManageObjectives,
  isOpen,
  onToggle,
  onExpand,
  setTasks,
  setObjectives,
  onReload,
}: {
  workId: string;
  /** Todas las raíces del proyecto (lista plana de `GET /api/works/[id]`). */
  tasks: TaskDto[];
  objectives: ObjectiveDto[];
  /** Tareas: alta, orden, anidado (proyecto activo). */
  editable: boolean;
  /** Objetivos: ⋮, composers de sección y mover entre secciones (operar + no plantilla). */
  canManageObjectives: boolean;
  isOpen: (objectiveId: string) => boolean;
  onToggle: (objectiveId: string) => void;
  onExpand: (objectiveId: string) => void;
  setTasks: (update: (prev: TaskDto[]) => TaskDto[]) => void;
  setObjectives: (update: (prev: ObjectiveDto[]) => ObjectiveDto[]) => void;
  onReload: () => void;
}) {
  const [editing, setEditing] = useState<ObjectiveDto | null>(null);
  const [deleting, setDeleting] = useState<{ objective: ObjectiveDto; taskCount: number } | null>(null);

  const grouped = groupTasksByObjective(tasks, objectives);
  const hasObjectives = objectives.length > 0;
  const sections: DropSection[] = [
    { objectiveId: null, taskIds: grouped.general.map((t) => t.id) },
    ...grouped.sections.map((s) => ({ objectiveId: s.objective.id, taskIds: s.tasks.map((t) => t.id) })),
  ];

  const { sensors, handleDragEnd } = useProjectTaskDnd({
    workId,
    tasks,
    sections,
    objectives,
    canMoveBetweenSections: canManageObjectives,
    setTasks,
    onReload,
    onExpand,
  });

  /** Subir/Bajar: optimista, y si el servidor lo rechaza vuelve atrás y recarga. */
  const moveObjective = (id: string, dir: "up" | "down") => {
    const previous = objectives;
    const order = moveNeighbor(
      previous.map((o) => o.id),
      id,
      dir,
    );
    const byId = new Map(previous.map((o) => [o.id, o]));
    setObjectives(() => order.map((oid, i) => ({ ...byId.get(oid)!, position: i })));
    reorderObjectives(workId, order)
      .then((fresh) => setObjectives(() => fresh))
      .catch((err) => {
        setObjectives(() => previous);
        const status = (err as { status?: number }).status;
        showToast({
          message:
            status === 409
              ? "Los objetivos cambiaron mientras se ordenaban; se actualizó la lista"
              : (err as Error).message,
        });
        onReload();
      });
  };

  const saveAsTemplate = (objective: ObjectiveDto) => {
    saveObjectiveAsTemplate(objective.id)
      .then((t) =>
        showToast({ message: `Plantilla "${t.name}" creada`, href: `/works/${t.id}`, linkLabel: "Ver" }),
      )
      .catch((err) => showToast({ message: (err as Error).message }));
  };

  const confirmDelete = async (objective: ObjectiveDto, mode: DeleteObjectiveMode) => {
    const result = await deleteObjective(objective.id, mode);
    showToast({
      message:
        mode === "moveToGeneral" && result.movedTasks > 0
          ? `Objetivo eliminado; ${result.movedTasks === 1 ? "1 tarea pasó" : `${result.movedTasks} tareas pasaron`} a generales`
          : "Objetivo eliminado",
    });
    onReload();
  };

  /** Filas de una sección: ordenables si se puede editar, planas si no. */
  const renderRows = (list: TaskDto[], objectiveId: string | null) => {
    const context = { workId, objectiveId };
    if (!editable) {
      return list.map((task) => (
        <TaskItem key={task.id} task={task} context={context} canToggle={false} onChanged={onReload} />
      ));
    }
    return (
      <SortableContext items={list.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {list.map((task) => (
          <SortableTaskRow key={task.id} task={task} context={context} editable={editable} onChanged={onReload} />
        ))}
      </SortableContext>
    );
  };

  const general = (
    <div className="work-general-tasks">
      {hasObjectives &&
        (editable ? (
          <GeneralHeading droppable={canManageObjectives} />
        ) : (
          <h3 className="work-section-heading">Tareas generales</h3>
        ))}
      {editable && (
        <div className="work-task-composer">
          <TaskListEditor context={{ workId }} onCreated={onReload} />
        </div>
      )}
      <div className="work-task-list">{renderRows(grouped.general, null)}</div>
      {grouped.general.length === 0 &&
        (hasObjectives ? (
          editable ? (
            <EmptySectionDrop objectiveId={null} droppable={canManageObjectives}>
              Sin tareas generales.
            </EmptySectionDrop>
          ) : (
            <p className="work-section-empty">Sin tareas generales.</p>
          )
        ) : (
          <EmptyState
            icon={CheckSquare}
            title="Sin tareas todavía"
            description={
              editable
                ? canManageObjectives
                  ? "Escribí la primera tarea arriba o agregá un objetivo para organizar el proyecto."
                  : "Escribí la primera tarea arriba para empezar a organizar el proyecto."
                : "Este proyecto no tiene tareas."
            }
          />
        ))}
    </div>
  );

  const objectiveSections = grouped.sections.map(({ objective, tasks: sectionTasks }, i) => {
    const menuItems = canManageObjectives
      ? buildObjectiveMenuItems({
          isFirst: i === 0,
          isLast: i === grouped.sections.length - 1,
          onEdit: () => setEditing(objective),
          onMoveUp: () => moveObjective(objective.id, "up"),
          onMoveDown: () => moveObjective(objective.id, "down"),
          onSaveAsTemplate: () => saveAsTemplate(objective),
          onDelete: () => setDeleting({ objective, taskCount: countObjectiveTasks(sectionTasks) }),
        })
      : undefined;
    const body = (
      <>
        <div className="objective-task-list">{renderRows(sectionTasks, objective.id)}</div>
        {sectionTasks.length === 0 &&
          (editable ? (
            <EmptySectionDrop objectiveId={objective.id} droppable={canManageObjectives}>
              {canManageObjectives ? "Sin tareas. Escribí una abajo o arrastrá una acá." : "Sin tareas."}
            </EmptySectionDrop>
          ) : (
            <p className="work-section-empty">Sin tareas.</p>
          ))}
        {canManageObjectives && (
          <div className="work-task-composer is-inline">
            <TaskListEditor
              context={{ workId, objectiveId: objective.id }}
              placeholder={`Agregar tarea a «${objective.title}»…`}
              onCreated={onReload}
            />
          </div>
        )}
      </>
    );
    const common = {
      objective,
      tasks: sectionTasks,
      open: isOpen(objective.id),
      onToggle: () => onToggle(objective.id),
      menuItems,
      children: body,
    };
    return editable ? (
      <DroppableObjectiveSection key={objective.id} {...common} droppable={canManageObjectives} />
    ) : (
      <ObjectiveSection key={objective.id} {...common} />
    );
  });

  return (
    <div className="project-task-list">
      {editable ? (
        <DndContext sensors={sensors} collisionDetection={taskSectionCollision} onDragEnd={handleDragEnd}>
          {general}
          {objectiveSections}
        </DndContext>
      ) : (
        <>
          {general}
          {objectiveSections}
        </>
      )}
      {editing && (
        <EditObjectiveDialog
          open
          onClose={() => setEditing(null)}
          objective={editing}
          onSave={async (values) => {
            const updated = await updateObjective(editing.id, values);
            setObjectives((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }}
        />
      )}
      {deleting && (
        <DeleteObjectiveDialog
          open
          onClose={() => setDeleting(null)}
          title={deleting.objective.title}
          taskCount={deleting.taskCount}
          onConfirm={(mode) => confirmDelete(deleting.objective, mode)}
        />
      )}
    </div>
  );
}
