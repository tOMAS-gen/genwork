"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertCircle, Check, ChevronDown, Folder, LayoutDashboard } from "@/components/ui/icons";
import { columnProgress } from "./columnProgress";
import { boardProgress, taskIsDone, type BoardColumn, type BoardTask } from "./boardView";
import styles from "./BoardGrid.module.css";

function TaskRow({ task, compact }: { task: BoardTask; compact: boolean }) {
  const done = taskIsDone(task);
  const [expanded, setExpanded] = useState(false);
  const textId = useId();
  const hasDetail = compact && task.text.length > 180;
  return (
    <li className={styles.task} data-done={done}>
      <span className={styles.indicator} aria-hidden="true">
        {done ? <Check size={16} /> : <span style={{ background: task.status.color }} />}
      </span>
      <div className={styles.taskBody}>
        {task.parentId && (
          <div className={styles.parent}>Subtarea de: {task.parentText ?? "Tarea principal"}</div>
        )}
        <p id={textId} className={styles.taskTitle} data-collapsed={hasDetail && !expanded}>
          {task.text}
        </p>
        {hasDetail && (
          <button
            type="button"
            className={styles.detailToggle}
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Ver menos" : "Ver detalle"}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
        <div className={styles.taskMeta}>
          <span className={styles.project}>
            <Folder size={14} aria-hidden="true" />
            {task.workName ?? "Sin proyecto"}
          </span>
          {task.subtaskCount > 0 && (
            <span className={styles.children}>
              {task.subtaskDone}/{task.subtaskCount} subtareas
            </span>
          )}
        </div>
      </div>
      <span className={styles.status}>
        {task.subtaskCount > 0 ? (done ? "Completada" : "En curso") : task.status.name}
      </span>
    </li>
  );
}

/** Read-only sector overview, also available without navigation controls on TV. */
export function BoardGrid({ compact = false }: { compact?: boolean }) {
  const [board, setBoard] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestVersion = useRef(0);
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError(false);
    void api<BoardColumn[]>("/api/board")
      .then((data) => {
        if (version === requestVersion.current) setBoard(data);
      })
      .catch(() => {
        if (version === requestVersion.current) setLoadError(true);
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
  }, []);
  useEffect(() => {
    // Fetch the external snapshot on mount; later updates arrive through SSE.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      // This counter intentionally invalidates whichever request is current at unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
    };
  }, [load]);
  useLiveRefresh(load);

  const stats = boardProgress(board);

  return (
    <div className={styles.overview} data-compact={compact}>
      {board.length > 0 && (
        <div className={styles.summary}>
          <span>
            {stats.total - stats.done}{" "}
            {stats.total - stats.done === 1 ? "tarea pendiente" : "tareas pendientes"} ·{" "}
            {board.length} {board.length === 1 ? "sector" : "sectores"}
          </span>
          <span>
            {stats.done} de {stats.total} finalizadas
          </span>
        </div>
      )}
      {loadError && (
        <div className={styles.error} role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>
            {board.length
              ? "No se pudo actualizar. Se muestran los últimos datos recibidos."
              : "No se pudieron cargar las tareas."}
          </span>
          <button type="button" className="btn btn-ghost" onClick={load}>
            Reintentar
          </button>
        </div>
      )}
      {loading && board.length === 0 ? (
        <div className={styles.grid} aria-label="Cargando tareas" aria-busy="true">
          {[240, 320, 280].map((height) => (
            <Skeleton key={height} variant="card" height={`${height}px`} />
          ))}
        </div>
      ) : board.length === 0 ? (
        !loadError && (
          <EmptyState
            icon={LayoutDashboard}
            title="Todavía no hay sectores visibles"
            description="Las tareas aparecerán aquí cuando se asignen a un sector al que tengas acceso."
          />
        )
      ) : (
        <div className={styles.grid}>
          {board.map((column) => {
            const pendingTasks = column.tasks.filter((task) => !taskIsDone(task));
            // Progress still includes completed tasks, even though their rows are hidden.
            const { done, total } = columnProgress(column.tasks);
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <section
                className={styles.card}
                key={column.sector.id}
                aria-label={column.sector.name}
              >
                <header className={styles.cardHeader}>
                  <div className={styles.heading}>
                    <span
                      className={styles.sectorMark}
                      style={{ background: column.sector.color ?? "var(--accent)" }}
                      aria-hidden="true"
                    />
                    <h2>{column.sector.name}</h2>
                    <span
                      className={styles.count}
                      title="Tareas y subtareas pendientes, sin contar contenedoras"
                    >
                      {total - done}
                    </span>
                  </div>
                  <div className={styles.progressLabel}>
                    <span>
                      {total
                        ? `${done} de ${total} finalizadas`
                        : column.tasks.length
                          ? "Avance en las subtareas"
                          : "Sin tareas asignadas"}
                    </span>
                    {total > 0 && <strong>{pct}%</strong>}
                  </div>
                  <div
                    className={styles.progress}
                    role="progressbar"
                    aria-label={`Avance de ${column.sector.name}`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </header>
                {pendingTasks.length > 0 ? (
                  <ul
                    className={styles.tasks}
                    tabIndex={compact ? 0 : undefined}
                    aria-label={`Tareas de ${column.sector.name}`}
                  >
                    {pendingTasks.map((task) => (
                      <TaskRow key={task.id} task={task} compact={compact} />
                    ))}
                  </ul>
                ) : (
                  <p className={styles.empty}>Sin tareas pendientes.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
