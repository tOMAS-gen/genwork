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
import { RenameDialog } from "@/components/ui/RenameDialog";
import { ColorField } from "@/components/ui/ColorField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trash2, Settings, Pencil, List, LayoutGrid, CheckSquare } from "@/components/ui/icons";
import { TaskStatusSettings } from "@/components/admin/TaskStatusSettings";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";

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
  const [renaming, setRenaming] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [me, setMe] = useState<{ id: string; globalRole: "SUPERADMIN" | "MEMBER" | "READER" } | null>(null);
  usePageTitle(view?.sector.name ?? null);
  const router = useRouter();

  const load = useCallback(() => {
    void api<SectorView>(`/api/sectors/${id}/tasks`).then(setView).catch(() => {});
  }, [id]);

  useEffect(load, [load]);
  useLiveRefresh(load, { sectorId: id });

  useEffect(() => {
    void api<{ id: string; globalRole: "SUPERADMIN" | "MEMBER" | "READER" }>("/api/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  if (!view) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <Skeleton variant="text" height="28px" width="30%" />
        <div className="mt-2">
          <Skeleton variant="card" width="100%" height="40px" />
        </div>
        <div className="mt-2 flex gap-1">
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
          <Skeleton variant="text" width="70px" />
        </div>
        <div className="mt-2">
          <Skeleton variant="text" height="22px" width="40%" />
        </div>
        <div className="mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-1">
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canOperate = view.level === "operate";
  const isSuperAdmin = me?.globalRole === "SUPERADMIN";
  const scopeLabel =
    view.sector.scope.type === "GROUP"
      ? view.sector.scope.groupName ?? "Grupo"
      : view.sector.scope.type === "PERSONAL"
        ? "Personal"
        : "Global";

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
    <div className="mx-auto max-w-[1100px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {canOperate ? (
            <span className="[&_.color-field-trigger]:min-h-11 [&_.color-field-trigger]:min-w-11">
              <ColorField
                nullable
                value={view.sector.color}
                onChange={(hex) => void changeColor(hex)}
                ariaLabel="Color del sector"
                align="start"
              />
            </span>
          ) : (
            <span
              className={
                view.sector.color
                  ? "h-4 w-4 flex-shrink-0 rounded-full border border-[rgba(0,0,0,0.18)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted bg-transparent"
              }
              style={view.sector.color ? { background: view.sector.color } : undefined}
              aria-hidden="true"
            />
          )}
          <h1 className="m-0 min-w-0 flex-1 truncate" title={view.sector.name}>
            {view.sector.name}
          </h1>
          <span
            className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-md bg-[var(--hover-soft)] px-2 py-0.5 text-xs font-semibold tracking-wide text-text"
            title={`Ámbito: ${scopeLabel}`}
          >
            {scopeLabel}
          </span>
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

      {canOperate && showStatusSettings && (
        <div className="mt-3 rounded-xl border border-border bg-surface p-[18px]">
          <TaskStatusSettings scope={{ sectorId: id }} title="Estados de tarea de este sector" />
        </div>
      )}

      <h2 className="mt-4">Tareas del sector</h2>
      <div className="flex justify-end">
        <div
          className="inline-flex flex-shrink-0 overflow-hidden rounded-[8px] border border-border"
          role="group"
          aria-label="Vista de tareas"
        >
          <button
            type="button"
            className={`flex min-h-11 min-w-11 items-center gap-1 px-2.5 py-[5px] text-[13px] transition-colors ${
              taskView === "list" ? "bg-accent-soft text-accent" : "bg-transparent text-muted"
            }`}
            onClick={() => setTaskView("list")}
          >
            <List size={14} /> Lista
          </button>
          <button
            type="button"
            className={`flex min-h-11 min-w-11 items-center gap-1 border-l border-border px-2.5 py-[5px] text-[13px] transition-colors ${
              taskView === "board" ? "bg-accent-soft text-accent" : "bg-transparent text-muted"
            }`}
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
            <div key={group.work.id} className="mt-2">
              <h3 className="mb-1 text-[0.85rem] text-muted">{group.work.name}</h3>
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
        <EmptyState
          icon={CheckSquare}
          title="Sin tareas todavía"
          description="Todavía no hay tareas en este sector."
        />
      )}

      {view.refs.length > 0 && (
        <>
          <h2 className="mt-7">Referencias</h2>
          <p className="text-[13px] text-muted">
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
