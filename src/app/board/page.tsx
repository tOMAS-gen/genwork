"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { BoardNav } from "@/components/nav/BoardNav";

interface BoardColumn {
  sector: { id: string; name: string };
  pending: { id: string; text: string; workName: string | null }[];
  done: { id: string; text: string; workName: string | null }[];
}

/**
 * Dashboard de estado por sector para pantallas/TV (US6, FR-026): solo lectura,
 * se actualiza en vivo vía SSE. Navegación compacta salvo rol Lector (FR-108).
 */
export default function BoardPage() {
  const [board, setBoard] = useState<BoardColumn[]>([]);
  const [isReader, setIsReader] = useState(true); // por defecto oculta nav hasta saber el rol

  const load = useCallback(() => {
    void api<BoardColumn[]>("/api/board").then(setBoard).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    void api<{ user?: { globalRole?: string } }>("/api/auth/session")
      .then((s) => setIsReader(s?.user?.globalRole === "READER"))
      .catch(() => {});
  }, []);
  useLiveRefresh(load);

  return (
    <div className="board">
      {!isReader && <BoardNav />}
      {board.map((col) => (
        <div key={col.sector.id} className="card">
          <h2>#{col.sector.name}</h2>
          <p className="muted">
            {col.pending.length} pendientes · {col.done.length} realizadas
          </p>
          {col.pending.map((t) => (
            <div key={t.id} className="task">
              <span>☐</span>
              <span style={{ flex: 1 }}>
                {t.text} {t.workName && <span className="tag tag-work">/{t.workName}</span>}
              </span>
            </div>
          ))}
          {col.done.map((t) => (
            <div key={t.id} className="task done">
              <span>☑</span>
              <span className="task-text" style={{ flex: 1 }}>
                {t.text} {t.workName && <span className="tag tag-work">/{t.workName}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
      {board.length === 0 && (
        <p className="muted" style={{ padding: 24 }}>
          Sin sectores visibles para esta cuenta.
        </p>
      )}
    </div>
  );
}
