"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/components/ui/useApi";
import { DocEditor } from "@/components/editor/DocEditor";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { TaskViewToggle } from "@/components/tasks/TaskViewToggle";
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { LabelPicker, type WorkLabelDto } from "@/components/works/LabelPicker";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { StatusBar } from "@/components/works/StatusBar";

import { InlineDescription } from "@/components/works/InlineDescription";
import { FilesBrowser } from "@/components/files/FilesBrowser";
import { WorkActivityFeed } from "@/components/works/WorkActivityFeed";
import { ClientAccessPanel } from "@/components/works/ClientAccessPanel";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import { taskListProgress } from "@/lib/domain/works/taskListProgress";
import {
  CheckSquare,
  Clock,
  Eye,
  FileText,
  Folder,
  Copy,
  Check,
  AlertCircle,
} from "@/components/ui/icons";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useToast } from "@/components/ui/Toast";

interface WorkFull {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  groupId: string | null;
  group: { id: string; name: string } | null;
  doc: { content: unknown } | null;
  tasks: TaskDto[];
  attachments: { id: string; fileName: string; size: number }[];
  archive: { status: "BUILDING" | "READY" | "CONFIRMED" | "FAILED" } | null;
  labels: WorkLabelDto[];
  nextcloudFolderPath: string | null;
  folderSeq: number;
  code: string;
  dueDate: string | null;
  stageId: string | null;
  stage: { id: string; name: string; color: string | null } | null;
  isTemplate: boolean;
  access: "read" | "operate";
  /** Feature 059: si este usuario administra el ámbito y puede dar acceso a clientes. */
  canManageClients: boolean;
}

/**
 * Fila arrastrable de la lista de tareas (feature 052, T005/T006): el handle
 * visual y el estilo de "arrastrando" viven en `TaskItem` (variant "list"), acá
 * solo se conecta `useSortable` y se le pasan `attributes`/`listeners` como
 * `dragHandleProps` — así el arrastre se activa desde el ícono del handle, no
 * desde toda la fila, y clicks en checkbox/select/texto/borrar no se ven afectados.
 */
function SortableTaskRow({
  task,
  workId,
  editable,
  onChanged,
}: {
  task: TaskDto;
  workId: string;
  editable: boolean;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  /**
   * Zona de anidado (062-subtareas): además de ser ordenable, cada fila raíz es
   * un destino donde soltar OTRA tarea para colgarla como subtarea. El id lleva
   * el prefijo `nest:` para que `handleDragEnd` distinga las dos intenciones —
   * soltar entre filas reordena, soltar sobre esta zona anida. Una subtarea no
   * es destino: el anidado es de un solo nivel.
   */
  const { setNodeRef: setNestRef, isOver: isNestTarget } = useDroppable({
    id: `nest:${task.id}`,
    disabled: !editable || !!task.parentId,
  });

  return (
    <div
      ref={setNodeRef}
      className="task-sortable-row"
      // Rows can have different heights; dragging must translate without resizing their content.
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        touchAction: "none",
      }}
    >
      <div ref={setNestRef} className={isNestTarget ? "task-nest-target" : undefined}>
        <TaskItem
          task={task}
          context={{ workId }}
          canToggle={editable}
          onChanged={onChanged}
          dragHandleProps={{ attributes, listeners }}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}

/**
 * Página del proyecto como hoja estilo Notion (FR-104): título grande, descripción,
 * documento fluido sin cajas, sección Tareas tipo bloc de notas. Acciones en menú ⋮.
 */
export default function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [work, setWork] = useState<WorkFull | null>(null);
  const [loadError, setLoadError] = useState(false);
  usePageTitle(work?.name ?? null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "docs" | "files" | "activity" | "clients">(
    "tasks",
  );
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [codeCopied, setCodeCopied] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoadError(false);
    void api<WorkFull>(`/api/works/${id}`)
      .then((w) => {
        setWork(w);
        setDocLoaded(true);
      })
      .catch(() => {
        toast("Error al cargar el proyecto", "error");
        setLoadError(true);
      });
  }, [id, toast]);

  useEffect(load, [load]);
  useLiveRefresh(load, { workId: id });

  const handleDueDateChange = useCallback(
    (iso: string | null) => {
      void api(`/api/works/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate: iso }),
      })
        .then(load)
        .catch(() => {
          toast("Error al actualizar la fecha", "error");
        });
    },
    [id, load, toast],
  );

  // Sensores de dnd-kit (feature 052, T005): PointerSensor con umbral de distancia
  // para que un click simple sobre la casilla/selector/texto de una tarea no se
  // interprete como el inicio de un arrastre; KeyboardSensor para accesibilidad.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Llama al PATCH de reorder (T003) con el array completo de IDs ya reordenado
   * y reconcilia el estado optimista con la respuesta (o revierte en error).
   */
  const commitReorder = useCallback(
    (reordered: TaskDto[], previousTasks: TaskDto[]) => {
      void api<TaskDto[]>(`/api/works/${id}/tasks/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedTaskIds: reordered.map((t) => t.id) }),
      })
        .then((tasks) => {
          setWork((latest) => (latest ? { ...latest, tasks } : latest));
        })
        .catch((err) => {
          // Revertimos el optimismo; si el conflicto es porque el conjunto de
          // tareas cambió mientras se reordenaba (409 TASK_SET_CHANGED), además
          // refrescamos desde el servidor y avisamos al usuario (contrato T005).
          setWork((latest) => (latest ? { ...latest, tasks: previousTasks } : latest));
          const status = (err as { status?: number }).status;
          if (status === 409) {
            toast(
              "El orden cambió mientras se reordenaba la tarea; se actualizó la lista",
              "error",
            );
            load();
          } else {
            toast("Error al reordenar las tareas", "error");
          }
        });
    },
    [id, load, toast],
  );

  /**
   * Cuelga una tarea de otra (o la promueve con `parentId: null`) reusando el
   * mismo PATCH que el menú. El backend valida un solo nivel, misma pertenencia
   * y que la tarea movida no tenga hijas abiertas, así que acá sólo hay que
   * mostrar el error si lo rechaza.
   */
  const commitReparent = useCallback(
    (taskId: string, parentId: string | null) => {
      void api(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ parentId }),
      })
        .then(load)
        .catch((err) => {
          toast((err as Error).message, "error");
          load();
        });
    },
    [load, toast],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Soltar SOBRE una fila (zona `nest:`) cuelga la tarea de esa otra; soltar
      // entre filas reordena, que es el comportamiento de siempre (feature 052).
      const overId = String(over.id);
      if (overId.startsWith("nest:")) {
        const parentId = overId.slice("nest:".length);
        if (parentId !== String(active.id)) commitReparent(String(active.id), parentId);
        return;
      }

      setWork((current) => {
        if (!current) return current;
        const oldIndex = current.tasks.findIndex((t) => t.id === active.id);
        const newIndex = current.tasks.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return current;

        const previousTasks = current.tasks;
        const reordered = arrayMove(previousTasks, oldIndex, newIndex);
        commitReorder(reordered, previousTasks);
        return { ...current, tasks: reordered };
      });
    },
    [commitReorder, commitReparent],
  );

  if (!work && loadError) {
    return (
      <div className="sheet">
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar el proyecto"
          description="Hubo un error de red o del servidor. Probá de nuevo."
          action={{ label: "Reintentar", onClick: load }}
        />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="sheet work-detail" role="status" aria-label="Cargando proyecto">
        <Skeleton variant="text" width="220px" />
        <div className="work-overview work-loading-summary">
          <Skeleton variant="text" height="32px" width="60%" />
          <Skeleton variant="text" width="35%" />
          <Skeleton variant="card" height="72px" />
        </div>
        <div className="work-workspace work-loading-summary">
          <Skeleton variant="text" height="40px" width="75%" />
          <Skeleton variant="card" height="44px" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" height="40px" />
          ))}
        </div>
      </div>
    );
  }

  const editable = work.status === "ACTIVE";
  // 062-subtareas (hallazgo Importante 4 de revisión): `work.tasks` son solo
  // raíces (works/[id]/route.ts las anida); ver taskListProgress.ts.
  const { done: doneCount, total: totalCount } = taskListProgress(work.tasks);
  const projectColor = getProjectColor(work.labels);

  return (
    <div className="sheet work-detail">
      <Breadcrumbs
        items={[
          work.isTemplate
            ? { label: "Proyectos plantilla", href: "/?filter=templates" }
            : { label: "Todos los proyectos", href: "/" },
          { label: work.name },
        ]}
      />

      <section className="work-overview" aria-label="Resumen del proyecto">
        <div className="work-overview-main">
          <div className="work-overview-info">
            <div className="work-overview-header">
              <div className="work-identity">
                <span
                  className="work-symbol"
                  style={projectColor ? { color: projectColor } : undefined}
                >
                  <Folder size={24} aria-hidden="true" />
                </span>
                <div className="work-heading">
                  <div className="work-title-line">
                    <h1>{work.name}</h1>
                  </div>
                  <div className="work-subtitle">
                    <p>{work.group ? `Grupo ${work.group.name}` : "Espacio personal"}</p>
                    <span className="work-state">
                      {work.isTemplate
                        ? "Plantilla"
                        : work.status === "ARCHIVED"
                          ? "Archivado"
                          : "Activo"}
                    </span>
                  </div>
                </div>
              </div>
              <ProjectMenu
                workId={id}
                workName={work.name}
                workStatus={work.status}
                canRename={work.access === "operate"}
                onRenamed={load}
              />
            </div>

            {(editable || work.description) && (
              <div className="work-description">
                <span className="work-field-label">Descripción</span>
                <InlineDescription
                  workId={id}
                  initialValue={work.description}
                  editable={editable}
                />
              </div>
            )}
          </div>
          <StatusBar
            done={doneCount}
            total={totalCount}
            dueDate={work.dueDate}
            status={work.status}
            onDueDateChange={editable ? handleDueDateChange : undefined}
            stageProps={
              editable
                ? {
                    workId: id,
                    groupId: work.groupId,
                    currentStageId: work.stageId ?? null,
                    currentStage: work.stage ?? null,
                    onChanged: load,
                  }
                : undefined
            }
          />
        </div>
        <div className="work-metadata">
          <div className="work-labels">
            <span className="work-field-label">Etiquetas</span>
            <LabelPicker
              workId={id}
              workGroupId={work.groupId}
              labels={work.labels}
              onChanged={load}
            />
          </div>
          <div className="work-code">
            <span className="work-field-label">Código / carpeta</span>
            <div className="work-code-value">
              <code title={work.code}>{work.code}</code>
              <button
                type="button"
                className="work-copy"
                aria-label={codeCopied ? "Código copiado" : "Copiar código del proyecto"}
                title={codeCopied ? "Código copiado" : "Copiar código"}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(work.code)
                    .then(() => {
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 1500);
                    })
                    .catch(() => toast("No se pudo copiar el código", "error"));
                }}
              >
                {codeCopied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
                <span aria-live="polite">{codeCopied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`work-workspace${activeTab === "docs" ? " work-workspace-docs" : ""}`} aria-label="Contenido del proyecto">
        <ProjectTabs
          panelId="project-content"
          items={[
            { key: "tasks", label: "Tareas", icon: CheckSquare },
            { key: "docs", label: "Documentos", icon: FileText },
            { key: "files", label: "Archivos", icon: Folder },
            { key: "activity", label: "Actividad", icon: Clock },
            // Feature 059: dar acceso a alguien de afuera es administración del ámbito
            // (ADMIN del grupo, dueño personal o super-admin), no operación cotidiana.
            ...(work.canManageClients
              ? [{ key: "clients", label: "Acceso cliente", icon: Eye }]
              : []),
          ]}
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as "tasks" | "docs" | "files" | "activity" | "clients")}
        />

        <div
          id="project-content"
          role="tabpanel"
          aria-labelledby={`project-content-tab-${activeTab}`}
          className="work-tab-content"
        >
          {activeTab === "tasks" && (
            <>
              <div className="work-tasks-heading">
                <div className="work-tasks-title">
                  <h2>Tareas</h2>
                  <span>{totalCount - doneCount} pendientes</span>
                </div>
                <TaskViewToggle value={taskView} onChange={setTaskView} />
              </div>
              {editable && (
                <div className="work-task-composer">
                  <TaskListEditor context={{ workId: id }} onCreated={load} />
                </div>
              )}
              {taskView === "list" ? (
                <div className="work-task-list">
                  {editable ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={work.tasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {work.tasks.map((task) => (
                          <SortableTaskRow
                            key={task.id}
                            task={task}
                            workId={id}
                            editable={editable}
                            onChanged={load}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    work.tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        context={{ workId: id }}
                        canToggle={editable}
                        onChanged={load}
                      />
                    ))
                  )}
                  {work.tasks.length === 0 && (
                    <EmptyState
                      icon={CheckSquare}
                      title="Sin tareas todavía"
                      description={
                        editable
                          ? "Escribí la primera tarea arriba para empezar a organizar el proyecto."
                          : "Este proyecto no tiene tareas."
                      }
                    />
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <TaskBoardView
                    tasks={work.tasks}
                    context={{ workId: id }}
                    canToggle={editable}
                    onChanged={load}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === "docs" && docLoaded && (
            <DocEditor
              workId={id}
              initialContent={work.doc?.content ?? null}
              editable={editable && work.access === "operate"}
              filename={`${work.name} - Documentación`}
              onContentChange={(content) => setWork((current) => current ? { ...current, doc: { content } } : current)}
            />
          )}

          {activeTab === "files" && <FilesBrowser workId={id} />}

          {activeTab === "activity" && <WorkActivityFeed workId={id} />}

          {activeTab === "clients" && work.canManageClients && (
            <ClientAccessPanel workId={id} groupId={work.groupId} />
          )}
        </div>
      </section>
    </div>
  );
}
