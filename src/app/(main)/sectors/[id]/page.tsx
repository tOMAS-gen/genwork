"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import {
  groupReferencesBySource,
  referenceTaskContext,
} from "@/components/tasks/groupReferencesBySource";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Menu } from "@/components/ui/Menu";
import { RenameDialog } from "@/components/ui/RenameDialog";
import { ColorField } from "@/components/ui/ColorField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trash2, Settings, Pencil, CheckSquare, Layers, AlertCircle } from "@/components/ui/icons";
import { TaskStatusSettings } from "@/components/admin/TaskStatusSettings";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { TaskViewToggle } from "@/components/tasks/TaskViewToggle";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { progress } from "@/lib/domain/works/progress";

interface SectorView {
  sector: {
    id: string;
    name: string;
    color: string | null;
    scope: {
      type: "GROUP" | "PERSONAL" | "GLOBAL";
      groupId?: string;
      groupName?: string;
      ownerId?: string;
    };
  };
  loose: TaskDto[];
  byWork: {
    work: { id: string; name: string; status: string; group: { id: string; name: string } | null };
    tasks: TaskDto[];
  }[];
  refs: TaskDto[];
  metrics: { total: number; done: number };
  level: "read" | "operate";
}

/**
 * Vista de sector (US3): tareas de ejecución completables + apartado Referencias
 * (FR-040, solo lectura) + filtros combinables (US4) + creación con /trabajo (FR-012).
 */
export default function SectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<SectorView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showStatusSettings, setShowStatusSettings] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [me, setMe] = useState<{
    id: string;
    globalRole: "SUPERADMIN" | "MEMBER" | "READER";
  } | null>(null);
  usePageTitle(view?.sector.name ?? null);
  const router = useRouter();

  const load = useCallback(() => {
    setLoadError(false);
    void api<SectorView>(`/api/sectors/${id}/tasks`)
      .then(setView)
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(load, [load]);
  useLiveRefresh(load, { sectorId: id });

  useEffect(() => {
    void api<{ id: string; globalRole: "SUPERADMIN" | "MEMBER" | "READER" }>("/api/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  if (!view && loadError) {
    return (
      <div className="sheet">
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar el sector"
          description="Probá de nuevo para ver las tareas del sector."
          action={{ label: "Reintentar", onClick: load }}
        />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="sheet work-detail" role="status" aria-label="Cargando sector">
        <Skeleton variant="text" width="220px" />
        <div className="work-overview work-loading-summary">
          <Skeleton variant="text" height="32px" width="60%" />
          <Skeleton variant="text" height="32px" width="40%" />
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

  const canOperate = view.level === "operate";
  const isSuperAdmin = me?.globalRole === "SUPERADMIN";
  const sectorProgress = progress(view.metrics.done, view.metrics.total);
  const pendingCount = Math.max(0, view.metrics.total - view.metrics.done);
  const scopeLabel =
    view.sector.scope.type === "GROUP"
      ? (view.sector.scope.groupName ?? "Grupo")
      : view.sector.scope.type === "PERSONAL"
        ? "Personal"
        : "Global";

  const removeSector = async () => {
    try {
      await api(`/api/sectors/${id}`, { method: "DELETE" });
    } catch (err) {
      const body = (
        err as {
          body?: { error?: { affectedTasks?: number; looseTasks?: number; message?: string } };
        }
      ).body;
      const msg = body?.error?.message ?? (err as Error).message;
      const ok = await showConfirm(msg + "\n\n¿Eliminar el sector igualmente?", {
        title: "Eliminar sector",
        confirmLabel: "Eliminar",
        danger: true,
      });
      if (ok) {
        await api(`/api/sectors/${id}?confirm=true`, { method: "DELETE" });
        router.push("/sectors");
      }
    }
  };

  const changeColor = async (hex: string) => {
    try {
      await api(`/api/sectors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ color: hex === "" ? null : hex }),
      });
      load();
    } catch {
      // el error de validación/permiso se ignora en la UI (color es opcional)
    }
  };

  return (
    <div className="sheet work-detail sector-detail">
      <Breadcrumbs items={[{ label: "Sectores", href: "/sectors" }, { label: view.sector.name }]} />
      <section className="work-overview sector-overview" aria-label="Resumen del sector">
        <div className="work-overview-main">
          <div className="work-overview-info">
            <div className="work-overview-header">
              <div className="work-identity">
                <span
                  className="work-symbol"
                  style={view.sector.color ? { color: view.sector.color } : undefined}
                >
                  <Layers size={24} aria-hidden="true" />
                </span>
                <div className="work-heading">
                  <div className="work-title-line">
                    <h1>{view.sector.name}</h1>
                  </div>
                  <div className="work-subtitle">
                    <p>
                      {view.sector.scope.type === "GROUP"
                        ? `Grupo ${scopeLabel}`
                        : scopeLabel === "Personal"
                          ? "Espacio personal"
                          : "Sector global"}
                    </p>
                    {!canOperate && <span className="work-state">Solo lectura</span>}
                  </div>
                </div>
              </div>
              {canOperate && (
                <Menu
                  label="Acciones del sector"
                  className="[&_.icon-btn]:h-11 [&_.icon-btn]:w-11"
                  items={[
                    {
                      label: "Estados de tarea",
                      icon: <Settings size={16} />,
                      onSelect: () => setShowStatusSettings((v) => !v),
                    },
                    ...(isSuperAdmin
                      ? [
                          {
                            label: "Renombrar…",
                            icon: <Pencil size={16} />,
                            onSelect: () => setRenaming(true),
                          },
                        ]
                      : []),
                    {
                      label: "Eliminar sector",
                      icon: <Trash2 size={16} />,
                      danger: true,
                      onSelect: () => void removeSector(),
                    },
                  ]}
                />
              )}
            </div>
          </div>
          <div className="work-status-bar">
            <div className="work-progress-summary">
              <span className="work-field-label">Avance del sector</span>
              <div className="work-progress-values">
                <strong>{sectorProgress ? `${sectorProgress.pct}%` : "Sin tareas"}</strong>
                <span>
                  {view.metrics.done} de {view.metrics.total} completadas
                </span>
              </div>
              {sectorProgress && (
                <div
                  className="work-progress-track"
                  role="progressbar"
                  aria-label="Avance del sector"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={sectorProgress.pct}
                >
                  <div className="work-progress-fill" style={{ width: `${sectorProgress.pct}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="work-metadata sector-metadata">
          <span className="work-field-label">
            {view.byWork.length}{" "}
            {view.byWork.length === 1 ? "proyecto vinculado" : "proyectos vinculados"}
          </span>
          {canOperate && (
            <div className="sector-color-control">
              <span className="work-field-label">Color del sector</span>
              <ColorField
                nullable
                value={view.sector.color}
                onChange={(hex) => void changeColor(hex)}
                ariaLabel="Color del sector"
                align="end"
              />
            </div>
          )}
        </div>
      </section>

      {canOperate && showStatusSettings && (
        <div className="work-workspace work-tab-content">
          <TaskStatusSettings scope={{ sectorId: id }} title="Estados de tarea de este sector" />
        </div>
      )}

      <section
        className="work-workspace work-tab-content sector-tasks"
        aria-labelledby="sector-tasks-title"
      >
        <div className="work-tasks-heading">
          <div className="work-tasks-title">
            <h2 id="sector-tasks-title">Tareas</h2>
            <span>{pendingCount} pendientes</span>
          </div>
          <TaskViewToggle value={taskView} onChange={setTaskView} />
        </div>

        {canOperate && (
          <div className="work-task-composer">
            <TaskListEditor context={{ sectorId: id }} onCreated={load} />
          </div>
        )}

        {view.loose.length === 0 && view.byWork.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Sin tareas todavía"
            description={
              canOperate
                ? "Escribí la primera tarea arriba para empezar a organizar el sector."
                : "Todavía no hay tareas en este sector."
            }
          />
        ) : taskView === "list" ? (
          <>
            {view.loose.length > 0 && (
              <div className="sector-task-group">
                {view.byWork.length > 0 && <h3 className="sector-loose-heading">Sin proyecto</h3>}
                {view.loose.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    context={{ sectorId: id }}
                    canToggle={canOperate}
                    onChanged={load}
                  />
                ))}
              </div>
            )}
            {view.byWork.map((group) => (
              <div key={group.work.id} className="sector-task-group">
                <TaskGroupHeader work={group.work} />
                {group.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    context={{ sectorId: id, suppressWorkTag: true }}
                    canToggle={canOperate}
                    onChanged={load}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          <TaskBoardView
            tasks={[...view.loose, ...view.byWork.flatMap((g) => g.tasks)]}
            context={{ sectorId: id }}
            canToggle={canOperate}
            onChanged={load}
          />
        )}
      </section>

      {view.refs.length > 0 && (
        <section
          className="work-workspace work-tab-content sector-references"
          aria-labelledby="sector-references-title"
        >
          <div className="work-tasks-title">
            <h2 id="sector-references-title">Referencias</h2>
          </div>
          <p className="sector-reference-description">
            Tareas de otros sectores que necesitan el aporte de este sector. Podés completarlas si
            tenés permiso.
          </p>
          {groupReferencesBySource(view.refs).map((group) => (
            <div key={group.key} className="sector-task-group">
              {group.header.type === "work" ? (
                <TaskGroupHeader work={group.header.work} />
              ) : (
                <TaskGroupHeader sector={group.header.sector} />
              )}
              {group.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  context={referenceTaskContext(group.header, id)}
                  canToggle={canOperate}
                  onChanged={load}
                />
              ))}
            </div>
          ))}
        </section>
      )}

      <RenameDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Renombrar sector"
        label="sector"
        initialName={view.sector.name}
        onSave={async (name) => {
          await api(`/api/sectors/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
          load();
        }}
      />
    </div>
  );
}
