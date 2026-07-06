"use client";

import { use, useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { DocEditor } from "@/components/editor/DocEditor";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { LabelPicker, type WorkLabelDto } from "@/components/works/LabelPicker";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { StatusBar } from "@/components/works/StatusBar";

import { InlineDescription } from "@/components/works/InlineDescription";
import { FilesBrowser } from "@/components/files/FilesBrowser";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import { CheckSquare, FileText, Folder } from "@/components/ui/icons";
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
  dueDate: string | null;
  stageId: string | null;
  stage: { id: string; name: string; color: string | null } | null;
  isTemplate: boolean;
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
  const [activeTab, setActiveTab] = useState<"tasks" | "docs" | "files">("tasks");
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
  const doneCount = work.tasks.filter((t) => t.state === "DONE").length;

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
              return color ? <span className={`project-dot label-${color.toLowerCase()}`} /> : null;
            })()}
            <div>
              <h1 className="sheet-title">{work.name}</h1>
              <p className="sheet-desc">
                {work.group ? `Grupo ${work.group.name}` : "Espacio personal"}
                {work.status === "ARCHIVED" && " · ARCHIVADO"}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <ProjectMenu
            workId={id}
            workName={work.name}
            workStatus={work.status}
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

      <ProjectTabs
        items={[
          { key: "tasks", label: "Tareas", icon: CheckSquare },
          { key: "docs", label: "Documentos", icon: FileText },
          { key: "files", label: "Archivos", icon: Folder },
        ]}
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as "tasks" | "docs" | "files")}
      />

      {activeTab === "tasks" && (
        <>
          {editable && <TaskListEditor context={{ workId: id }} onCreated={load} />}
          <div style={{ marginTop: "var(--space-1)" }}>
            {work.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                context={{ workId: id }}
                canToggle={editable}
                onChanged={load}
              />
            ))}
            {work.tasks.length === 0 && !editable && (
              <p className="muted">Sin tareas.</p>
            )}
          </div>
        </>
      )}

      {activeTab === "docs" && docLoaded && (
        <DocEditor workId={id} initialContent={work.doc?.content ?? null} editable={editable} />
      )}

      {activeTab === "files" && (
        <FilesBrowser workId={id} />
      )}
    </div>
  );
}
