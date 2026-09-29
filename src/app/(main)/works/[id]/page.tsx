"use client";

import { use, useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { DocEditor } from "@/components/editor/DocEditor";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import type { TaskDto } from "@/components/tasks/TaskItem";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { TaskViewToggle } from "@/components/tasks/TaskViewToggle";
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { MoveToFolderDialog } from "@/components/projects/MoveToFolderDialog";
import { LabelPicker, type WorkLabelDto } from "@/components/works/LabelPicker";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { StatusBar } from "@/components/works/StatusBar";

import { InlineDescription } from "@/components/works/InlineDescription";
import { FilesBrowser } from "@/components/files/FilesBrowser";
import { WorkActivityFeed } from "@/components/works/WorkActivityFeed";
import { ClientAccessPanel } from "@/components/works/ClientAccessPanel";
import { ProjectTaskList } from "@/components/objectives/ProjectTaskList";
import { AddObjectiveDialog } from "@/components/objectives/AddObjectiveDialog";
import { useCollapsedObjectives } from "@/components/objectives/useCollapsedObjectives";
import { objectiveAnchorId } from "@/components/objectives/ObjectiveSection";
import type { ObjectiveDto } from "@/components/objectives/objectiveApi";
import { groupTasksByObjective, flattenSections } from "@/lib/domain/objectives/grouping";
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
  Plus,
  Info,
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
  /** Feature 063: carpeta de proyectos (cliente, organización o tipo de trabajo). */
  projectFolderId: string | null;
  projectFolder: { id: string; name: string } | null;
  doc: { content: unknown } | null;
  /** Todas las raíces del proyecto (generales y de objetivos), cada una con `objectiveId`. */
  tasks: TaskDto[];
  /** objetivos: en orden; `[]` en una plantilla. */
  objectives?: ObjectiveDto[];
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

  // objetivos: una plantilla nunca muestra UI de objetivos (invariante: no tiene).
  const objectives = work && !work.isTemplate ? (work.objectives ?? []) : [];
  const { isOpen, toggle, expand } = useCollapsedObjectives(
    id,
    objectives.map((o) => o.id),
    work !== null,
  );
  const [addObjectiveOpen, setAddObjectiveOpen] = useState(false);
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false);
  /** Objetivo al que hay que bajar cuando su sección esté en pantalla. */
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const setTasks = useCallback((update: (prev: TaskDto[]) => TaskDto[]) => {
    setWork((w) => (w ? { ...w, tasks: update(w.tasks) } : w));
  }, []);
  const setObjectives = useCallback((update: (prev: ObjectiveDto[]) => ObjectiveDto[]) => {
    setWork((w) => (w ? { ...w, objectives: update(w.objectives ?? []) } : w));
  }, []);

  // objetivos (crítica I1): el chip lleva a `#objetivo-<id>`. Al entrar (o si
  // cambia el hash estando acá) se muestra la lista, se despliega esa sección
  // y, cuando ya está dibujada, se baja hasta ella. La carga es asíncrona, por
  // eso el scroll va en un efecto aparte que espera a que exista el ancla.
  useEffect(() => {
    const readHash = () => {
      const match = /^#objetivo-(.+)$/.exec(window.location.hash);
      if (!match) return;
      setActiveTab("tasks");
      setTaskView("list");
      expand(match[1]);
      setScrollTarget(match[1]);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [expand]);

  useEffect(() => {
    if (!scrollTarget || !work) return;
    const el = document.getElementById(objectiveAnchorId(scrollTarget));
    if (!el) {
      // El objetivo ya no existe (o todavía no llegó la recarga): nada que hacer.
      if (!(work.objectives ?? []).some((o) => o.id === scrollTarget)) setScrollTarget(null);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    el.querySelector<HTMLButtonElement>(".objective-toggle")?.focus({ preventScroll: true });
    setScrollTarget(null);
  }, [scrollTarget, work]);

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
  // Feature 063: las plantillas no van en carpetas.
  const canMoveToFolder = work.access === "operate" && !work.isTemplate;
  // objetivos (crítica I6): gestionar objetivos exige operar el proyecto; en una
  // plantilla no hay objetivos (una plantilla ES un objetivo).
  const canManageObjectives = editable && work.access === "operate" && !work.isTemplate;
  // 062-subtareas (hallazgo Importante 4 de revisión): `work.tasks` son solo
  // raíces (works/[id]/route.ts las anida); ver taskListProgress.ts.
  const { done: doneCount, total: totalCount } = taskListProgress(work.tasks);
  const projectColor = getProjectColor(work.labels);

  return (
    <div className="sheet work-detail">
      <Breadcrumbs
        items={[
          work.isTemplate
            ? { label: "Plantillas de objetivo", href: "/?filter=templates" }
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
                    {(work.projectFolder || canMoveToFolder) && (
                      <button
                        type="button"
                        className="work-folder-chip"
                        disabled={!canMoveToFolder}
                        onClick={() => setMoveToFolderOpen(true)}
                        title={canMoveToFolder ? "Mover a carpeta" : undefined}
                      >
                        <Folder size={14} aria-hidden="true" />
                        {work.projectFolder?.name ?? "Sin carpeta"}
                      </button>
                    )}
                    <span className="work-state">
                      {work.isTemplate
                        ? "Plantilla de objetivo"
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
                onMoveToFolder={canMoveToFolder ? () => setMoveToFolderOpen(true) : undefined}
              />
              <MoveToFolderDialog
                work={
                  moveToFolderOpen
                    ? { id, name: work.name, groupId: work.groupId, projectFolderId: work.projectFolderId }
                    : null
                }
                onClose={() => setMoveToFolderOpen(false)}
                onMoved={(folder) => {
                  toast(folder ? `Movido a ${folder.name}` : "Proyecto sin carpeta", "success");
                  load();
                }}
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
                <div className="work-tasks-actions">
                  {canManageObjectives && (
                    <button type="button" className="btn" onClick={() => setAddObjectiveOpen(true)}>
                      <Plus size={16} aria-hidden="true" />
                      Nuevo objetivo
                    </button>
                  )}
                  <TaskViewToggle value={taskView} onChange={setTaskView} />
                </div>
              </div>
              {work.isTemplate && (
                <p className="template-objective-note">
                  <Info size={16} aria-hidden="true" />
                  <span>
                    Esta plantilla es un objetivo: al insertarla en un proyecto, su nombre pasa a ser el
                    título del objetivo, la descripción se copia y se copian las tareas pendientes con sus
                    subtareas.
                  </span>
                </p>
              )}
              {taskView === "list" ? (
                <ProjectTaskList
                  workId={id}
                  tasks={work.tasks}
                  objectives={objectives}
                  editable={editable}
                  canManageObjectives={canManageObjectives}
                  isOpen={isOpen}
                  onToggle={toggle}
                  onExpand={expand}
                  setTasks={setTasks}
                  setObjectives={setObjectives}
                  onReload={load}
                />
              ) : (
                <>
                  {editable && (
                    <div className="work-task-composer">
                      <TaskListEditor context={{ workId: id }} onCreated={load} />
                    </div>
                  )}
                  <div style={{ marginTop: "var(--space-2)" }}>
                    {/* objetivos: el tablero sigue plano (generales primero, después
                        cada objetivo en orden); cada tarjeta lleva su chip. */}
                    <TaskBoardView
                      tasks={flattenSections(groupTasksByObjective(work.tasks, objectives))}
                      context={{ workId: id }}
                      canToggle={editable}
                      onChanged={load}
                      objectiveOptions={canManageObjectives && objectives.length > 0 ? objectives : undefined}
                    />
                  </div>
                </>
              )}
              {canManageObjectives && (
                <AddObjectiveDialog
                  open={addObjectiveOpen}
                  onClose={() => setAddObjectiveOpen(false)}
                  workId={id}
                  onCreated={(objective) => {
                    // Se suma ya (sin esperar la recarga) para poder bajar hasta él.
                    setObjectives((prev) =>
                      prev.some((o) => o.id === objective.id) ? prev : [...prev, objective],
                    );
                    setScrollTarget(objective.id);
                    load();
                  }}
                />
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
