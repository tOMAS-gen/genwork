"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { usePageTitle } from "@/lib/usePageTitle";
import { ProjectTabs } from "@/components/works/ProjectTabs";
import { ProgressBar } from "@/components/works/ProgressBar";
import { DocEditor } from "@/components/editor/DocEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, Calendar, CheckSquare, FileText, History, Inbox } from "@/components/ui/icons";
import { PortalTaskItem } from "@/components/portal/PortalTaskItem";
import { PortalActivityFeed } from "@/components/portal/PortalActivityFeed";
import type { PortalActivityEntry, PortalWorkDetail } from "@/components/portal/types";

/**
 * Detalle de proyecto en el portal (feature 059, US3 y US4).
 *
 * Tres secciones: Tareas, Documentos y Actividad. **No** hay Archivos: la decisión
 * de producto se hace cumplir en el servidor (las rutas de archivos están cerradas
 * para un cliente), no solo ocultando la pestaña.
 */

const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type TabKey = "tasks" | "doc" | "activity";

const TABS = [
  { key: "tasks", label: "Tareas", icon: CheckSquare },
  { key: "doc", label: "Documentos", icon: FileText },
  { key: "activity", label: "Actividad", icon: History },
];

export default function PortalWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [work, setWork] = useState<PortalWorkDetail | null>(null);
  const [activity, setActivity] = useState<PortalActivityEntry[] | null>(null);
  const [tab, setTab] = useState<TabKey>("tasks");
  const [error, setError] = useState<string | null>(null);

  usePageTitle(work?.name ?? "Proyecto");

  const load = useCallback(() => {
    api<PortalWorkDetail>(`/api/portal/works/${id}`)
      .then((data) => {
        setWork(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);
  useLiveRefresh(load, { workId: id }, { url: "/api/portal/stream" });

  // La actividad se pide recién al abrir su pestaña: no hace falta para responder
  // "cómo va el proyecto" y es la consulta más cara de las tres.
  useEffect(() => {
    if (tab !== "activity" || activity !== null) return;
    api<{ entries: PortalActivityEntry[] }>(`/api/portal/works/${id}/activity`)
      .then((data) => setActivity(data.entries))
      .catch((e: Error) => setError(e.message));
  }, [tab, activity, id]);

  if (error) {
    return (
      <>
        <Link href="/portal" className="btn btn-ghost">
          <ArrowLeft size={15} /> Mis proyectos
        </Link>
        <p className="form-error">{error}</p>
      </>
    );
  }

  if (!work) {
    return (
      <>
        <Skeleton height="32px" />
        <Skeleton height="220px" variant="card" />
      </>
    );
  }

  const due = work.dueDate ? new Date(work.dueDate) : null;

  return (
    <>
      <Link href="/portal" className="btn btn-ghost portal-back">
        <ArrowLeft size={15} /> Mis proyectos
      </Link>

      <h1 className="page-title">{work.name}</h1>
      {work.description && <p className="portal-work-description">{work.description}</p>}

      <div className="portal-work-meta">
        {work.stage && <span className="portal-work-stage">Etapa: {work.stage.name}</span>}
        {due && (
          <span className="portal-work-due">
            <Calendar size={14} aria-hidden="true" />
            Entrega: {dueDateFormatter.format(due)}
          </span>
        )}
        {work.labels.map((l) => (
          <span
            key={l.valueName}
            className="label-chip color-chip"
            style={{ "--c": l.color } as React.CSSProperties}
          >
            {l.valueName}
          </span>
        ))}
      </div>

      <ProgressBar done={work.taskCounts.done} total={work.taskCounts.total} />

      <ProjectTabs items={TABS} activeKey={tab} onChange={(k) => setTab(k as TabKey)} />

      {tab === "tasks" &&
        (work.tasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="El proyecto todavía no tiene tareas"
            description="Cuando se carguen las tareas, vas a poder seguir su avance desde acá."
          />
        ) : (
          <ul className="task-list portal-task-list">
            {work.tasks.map((task) => (
              <PortalTaskItem key={task.id} task={task} />
            ))}
          </ul>
        ))}

      {/* editable={false}: TipTap deja la vista no editable, lo que bloquea también
          pegar y arrastrar contenido, y oculta la barra de herramientas (FR-020). */}
      {tab === "doc" && <DocEditor workId={work.id} initialContent={work.doc?.content} editable={false} />}

      {tab === "activity" &&
        (activity === null ? <Skeleton height="140px" /> : <PortalActivityFeed entries={activity} />)}
    </>
  );
}
