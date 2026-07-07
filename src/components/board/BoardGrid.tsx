"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { LayoutDashboard } from "@/components/ui/icons";
import { progress } from "@/lib/domain/works/progress";

interface BoardColumn {
  sector: { id: string; name: string; color: string | null };
  tasks: { id: string; text: string; state: string; workName: string | null; workColor: string | null }[];
}

/**
 * Grilla de estado por sector para pantallas/TV (US6, FR-026): solo lectura,
 * se actualiza en vivo vía SSE. Se renderiza tanto dentro del shell con drawer
 * (/board) como en la vista pelada para rol Lector (/tv) — feature 004, US3.
 *
 * Grilla tipo masonry (columnas CSS): cada sector ocupa el alto que le
 * corresponde según su cantidad de tareas, en vez de estirarse a la fila más
 * alta como en un grid uniforme.
 */
export function BoardGrid() {
  const [board, setBoard] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void api<BoardColumn[]>("/api/board")
      .then(setBoard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  if (loading && board.length === 0) {
    return (
      <div className="board-grid">
        <Skeleton variant="card" height="200px" />
        <Skeleton variant="card" height="280px" />
        <Skeleton variant="card" height="160px" />
      </div>
    );
  }

  if (board.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Sin datos en el board"
        description="No hay sectores visibles para esta cuenta. Crea un nuevo proyecto para comenzar."
      />
    );
  }

  return (
    <div className="board-grid">
      {board.map((col) => {
        const doneCount = col.tasks.filter((t) => t.state === "DONE").length;
        const total = col.tasks.length;
        const prog = progress(doneCount, total);
        const colorClass = col.sector.color ? "color-chip" : "pc-name-pill-default";

        return (
          <div key={col.sector.id} className="board-card">
            {/* Row 1: pill nombre del sector, coloreada según el color del sector */}
            <div className="card-header">
              <span
                className={`pc-name-pill ${colorClass}`}
                style={col.sector.color ? ({ "--c": col.sector.color, color: "var(--text)" } as React.CSSProperties) : undefined}
              >
                {col.sector.name.toUpperCase()}
              </span>
            </div>

            {/* Row 2: barra de progreso */}
            {prog && (
              <div className="pc-progress">
                <div
                  role="progressbar"
                  aria-valuenow={prog.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progreso: ${prog.pct}%`}
                  className="pc-progress-track"
                >
                  <div className="pc-progress-fill" style={{ width: `${prog.pct}%` }} />
                </div>
                <span className="pc-progress-pct">{prog.pct}%</span>
              </div>
            )}

            {/* Row 2b: contador de tareas */}
            {total > 0 && (
              <span className="pc-task-count">
                {doneCount}/{total}
              </span>
            )}

            {/* Row 3: tareas, sin emojis */}
            {col.tasks.map((t) => (
              <div key={t.id} className={t.state === "DONE" ? "task done" : "task"}>
                <input type="checkbox" checked={t.state === "DONE"} disabled />
                <span className="task-text" style={{ flex: 1 }}>
                  {t.text}{" "}
                  {t.workName && (
                    <span
                      className={
                        t.workColor ? `tag tag-work label-${t.workColor.toLowerCase()}` : "tag tag-work"
                      }
                    >
                      /{t.workName}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
