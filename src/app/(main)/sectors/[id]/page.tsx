"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { TaskListEditor } from "@/components/tasks/TaskListEditor";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Menu } from "@/components/ui/Menu";
import { ColorField } from "@/components/ui/ColorField";
import { Trash2, Settings, List, LayoutGrid } from "@/components/ui/icons";
import { TaskStatusSettings } from "@/components/admin/TaskStatusSettings";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";

interface SectorView {
  sector: { id: string; name: string; color: string | null; group?: { id: string; name: string } | null };
  loose: TaskDto[];
  byWork: { work: { id: string; name: string; status: string }; tasks: TaskDto[] }[];
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
  const [showStatusSettings, setShowStatusSettings] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  usePageTitle(view?.sector.name ?? null);
  const router = useRouter();

  const load = useCallback(() => {
    void api<SectorView>(`/api/sectors/${id}/tasks`).then(setView).catch(() => {});
  }, [id]);

  useEffect(load, [load]);
  useLiveRefresh(load, { sectorId: id });

  if (!view) {
    return (
      <div className="sheet">
        <Skeleton variant="text" height="28px" width="30%" />
        <div style={{ marginTop: "var(--space-2)" }}>
          <Skeleton variant="card" width="100%" height="40px" />
        </div>
        <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-1)" }}>
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <Skeleton variant="text" height="22px" width="40%" />
        </div>
        <div style={{ marginTop: "var(--space-1)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: "var(--space-1)" }}>
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canOperate = view.level === "operate";

  const removeSector = async () => {
    try {
      await api(`/api/sectors/${id}`, { method: "DELETE" });
    } catch (err) {
      const body = (err as { body?: { error?: { affectedTasks?: number; looseTasks?: number; message?: string } } })
        .body;
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
    <div className="sheet">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {canOperate ? (
            <ColorField
              nullable
              value={view.sector.color}
              onChange={(hex) => void changeColor(hex)}
              ariaLabel="Color del sector"
              align="start"
            />
          ) : (
            <span
              className={`entity-color-dot${view.sector.color ? "" : " entity-color-dot-empty"}`}
              style={view.sector.color ? { background: view.sector.color } : undefined}
              aria-hidden="true"
            />
          )}
          <h1 style={{ margin: 0 }}>{view.sector.name}</h1>
        </div>
        {canOperate && (
          <Menu
            label="Acciones del sector"
            items={[
              {
                label: "Estados de tarea",
                icon: <Settings size={16} />,
                onSelect: () => setShowStatusSettings((v) => !v),
              },
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

      {canOperate && showStatusSettings && (
        <div className="card" style={{ marginTop: "var(--space-3)" }}>
          <TaskStatusSettings scope={{ sectorId: id }} title="Estados de tarea de este sector" />
        </div>
      )}

      <h2 style={{ marginTop: "var(--space-4)" }}>Tareas del sector</h2>
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

      {canOperate && (
        <TaskListEditor context={{ sectorId: id }} onCreated={load} />
      )}

      {taskView === "list" ? (
        <>
          {view.loose.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              context={{ sectorId: id }}
              canToggle={canOperate}
              onChanged={load}
            />
          ))}
          {view.byWork.map((group) => (
            <div key={group.work.id} style={{ marginTop: "var(--space-2)" }}>
              <h3 className="muted" style={{ fontSize: "0.85rem", marginBottom: "var(--space-1)" }}>
                {group.work.name}
              </h3>
              {group.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  context={{ sectorId: id }}
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
      {view.loose.length === 0 && view.byWork.length === 0 && (
        <p className="muted">Todavía no hay tareas en este sector.</p>
      )}

      {view.refs.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>Referencias</h2>
          <p className="muted">
            Tareas de otros sectores que necesitan aporte de #{view.sector.name}; se completan en
            su sector de ejecución.
          </p>
          {view.refs.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              context={{ sectorId: id }}
              canToggle={false}
              onChanged={load}
            />
          ))}
        </>
      )}
    </div>
  );
}
