"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
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
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { LabelPicker, type WorkLabelDto } from "@/components/works/LabelPicker";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { StatusBar } from "@/components/works/StatusBar";

import { InlineDescription } from "@/components/works/InlineDescription";
import { FilesBrowser } from "@/components/files/FilesBrowser";
import { WorkActivityFeed } from "@/components/works/WorkActivityFeed";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import { CheckSquare, Clock, FileText, Folder, List, LayoutGrid } from "@/components/ui/icons";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
      }}
    >
      <TaskItem
        task={task}
        context={{ workId }}
        canToggle={editable}
        onChanged={onChanged}
        dragHandleProps={{ attributes, listeners }}
        isDragging={isDragging}
      />
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
  usePageTitle(work?.name ?? null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "docs" | "files" | "activity">("tasks");
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [codeCopied, setCodeCopied] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    void api<WorkFull>(`/api/works/${id}`)
      .then((w) => {
        setWork(w);
        setDocLoaded(true);
      })
      .catch(() => {
        toast("Error al cargar el proyecto", "error");
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
    [id, load, toast]
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
            toast("El orden cambió mientras se reordenaba la tarea; se actualizó la lista", "error");
            load();
          } else {
            toast("Error al reordenar las tareas", "error");
          }
        });
    },
    [id, load, toast],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

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
    [commitReorder],
  );

  if (!work) {
    return (
      <div className="sheet">
        <div style={{ marginBottom: "var(--space-2)" }}>
          <Skeleton variant="text" width="20%" />
        </div>
        <div className="sheet-header">
          <div>
            <Skeleton variant="text" height="32px" width="40%" />
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <Skeleton variant="text" height="16px" width="100%" />
        </div>
        <div style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <Skeleton variant="text" width="80px" />
          <Skeleton variant="text" width="80px" />
          <Skeleton variant="text" width="80px" />
        </div>
        <div style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <Skeleton variant="text" height="32px" width="60px" />
          <Skeleton variant="text" height="32px" width="60px" />
          <Skeleton variant="text" height="32px" width="60px" />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: "var(--space-1)" }}>
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const editable = work.status === "ACTIVE";
  const doneCount = work.tasks.filter((t) => t.status.type === "FINAL").length;

  return (
    <div className="sheet">
      <div style={{ marginBottom: "var(--space-2)" }}>
        <Breadcrumbs items={[
          work.isTemplate
            ? { label: "Proyectos Plantilla", href: "/?filter=templates" }
            : { label: "Todos los Proyectos", href: "/" },
          { label: work.name },
        ]} />
      </div>
      <div className="sheet-header">
        <div>
          <div className="sheet-title-row">
            {(() => {
              const color = getProjectColor(work.labels);
              return (
                <span
                  className={`entity-color-dot${color ? "" : " entity-color-dot-empty"}`}
                  style={color ? { background: color } : undefined}
                  aria-hidden="true"
                />
              );
            })()}
            <h1 className="sheet-title">{work.name}</h1>
          </div>
          <p className="sheet-desc">
            {work.group ? `Grupo ${work.group.name}` : "Espacio personal"}
            {work.status === "ARCHIVED" && " · ARCHIVADO"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <ProjectMenu
            workId={id}
            workName={work.name}
            workStatus={work.status}
            canRename={work.access === "operate"}
            onRenamed={load}
          />
        </div>
      </div>

      <InlineDescription workId={id} initialValue={work.description} editable={editable} />

      <StatusBar
        done={doneCount}
        total={work.tasks.length}
        dueDate={work.dueDate}
        status={work.status}
        onDueDateChange={editable ? handleDueDateChange : undefined}
        stageProps={editable ? {
          workId: id,
          groupId: work.groupId,
          currentStageId: work.stageId ?? null,
          currentStage: work.stage ?? null,
          onChanged: load,
        } : undefined}
      />

      <div style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)", flexWrap: "wrap" }}>
        <LabelPicker
          workId={id}
          workGroupId={work.groupId}
          labels={work.labels}
          onChanged={load}
        />
      </div>

      {/* Código de referencia de la carpeta (feature 035) */}
      <div
        style={{
          marginTop: "var(--space-2)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
          Código / carpeta
        </span>
        <code
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "var(--text-sm)",
            background: "var(--hover-soft)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 8px",
            userSelect: "all",
          }}
        >
          {work.code}
        </code>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "2px 8px", fontSize: "var(--text-xs)" }}
          onClick={() => {
            void navigator.clipboard.writeText(work.code).then(() => {
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 1500);
            });
          }}
        >
          {codeCopied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>

      <ProjectTabs
        items={[
          { key: "tasks", label: "Tareas", icon: CheckSquare },
          { key: "docs", label: "Documentos", icon: FileText },
          { key: "files", label: "Archivos", icon: Folder },
          { key: "activity", label: "Actividad", icon: Clock },
        ]}
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as "tasks" | "docs" | "files" | "activity")}
      />

      {activeTab === "tasks" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div className="segmented" role="group" aria-label="Vista de tareas">
              <button
                type="button"
                className={`segmented-btn${taskView === "list" ? " is-active" : ""}`}
                onClick={() => setTaskView("list")}
              >
                <List size={14} /> Lista
              </button>
              <button
                type="button"
                className={`segmented-btn${taskView === "board" ? " is-active" : ""}`}
                onClick={() => setTaskView("board")}
              >
                <LayoutGrid size={14} /> Tablero
              </button>
            </div>
          </div>
          {editable && <TaskListEditor context={{ workId: id }} onCreated={load} />}
          {taskView === "list" ? (
            <div style={{ marginTop: "var(--space-1)" }}>
              {editable ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
              {work.tasks.length === 0 && !editable && (
                <p className="muted">Sin tareas.</p>
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
        <DocEditor workId={id} initialContent={work.doc?.content ?? null} editable={editable} />
      )}

      {activeTab === "files" && (
        <FilesBrowser workId={id} />
      )}

      {activeTab === "activity" && <WorkActivityFeed workId={id} />}
    </div>
  );
}
