"use client";

import { use, useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { DocEditor } from "@/components/editor/DocEditor";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { Paperclip } from "@/components/ui/icons";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";

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
}

/**
 * Página del proyecto como hoja estilo Notion (FR-104): título grande, descripción,
 * documento fluido sin cajas, sección Tareas tipo bloc de notas. Acciones en menú ⋮.
 */
export default function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [work, setWork] = useState<WorkFull | null>(null);
  const [docLoaded, setDocLoaded] = useState(false);

  const load = useCallback(() => {
    void api<WorkFull>(`/api/works/${id}`)
      .then((w) => {
        setWork(w);
        setDocLoaded(true);
      })
      .catch(() => {});
  }, [id]);

  useEffect(load, [load]);
  useLiveRefresh(load, { workId: id });

  if (!work) return <p className="muted">Cargando…</p>;

  const editable = work.status === "ACTIVE";

  return (
    <div className="sheet">
      <div className="sheet-header">
        <div>
          <h1 className="sheet-title">{work.name}</h1>
          <p className="sheet-desc">
            {work.description ? work.description + " · " : ""}
            {work.group ? `Grupo ${work.group.name}` : "Espacio personal"}
            {work.status === "ARCHIVED" && " · ARCHIVADO"}
          </p>
        </div>
        <ProjectMenu
          workId={id}
          workName={work.name}
          workStatus={work.status}
          archiveStatus={work.archive?.status ?? "NONE"}
        />
      </div>

      {/* Documento fluido (sin caja) */}
      {docLoaded && (
        <DocEditor workId={id} initialContent={work.doc?.content ?? null} editable={editable} />
      )}

      {work.attachments.length > 0 && (
        <div style={{ margin: "12px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {work.attachments.map((a) => (
            <a
              key={a.id}
              className="tag tag-exec"
              href={`/api/attachments/${a.id}`}
              target="_blank"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Paperclip size={13} /> {a.fileName}
            </a>
          ))}
        </div>
      )}

      {/* Tareas — bloc de notas */}
      <h2 className="sheet-section-title">Tareas</h2>
      {editable && <TaskListEditor context={{ workId: id }} onCreated={load} />}
      <div style={{ marginTop: 6 }}>
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
    </div>
  );
}
