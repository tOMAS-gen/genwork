"use client";

import { useEffect } from "react";

interface LiveEvent {
  type: "task-changed" | "work-changed";
  taskId?: string;
  workId?: string | null;
  sectorIds?: string[];
}

/**
 * Suscripción al SSE global (FR-036): re-consulta cuando un evento toca lo que
 * la vista muestra. `watch` filtra por workId/sectorId; sin watch, refresca todo.
 */
export function useLiveRefresh(
  onChange: () => void,
  watch?: { workId?: string; sectorId?: string },
) {
  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as LiveEvent;
        const touchesWork = watch?.workId && event.workId === watch.workId;
        const touchesSector = watch?.sectorId && event.sectorIds?.includes(watch.sectorId);
        if (!watch || touchesWork || touchesSector || event.type === "work-changed") {
          onChange();
        }
      } catch {
        /* heartbeat */
      }
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch?.workId, watch?.sectorId]);
}
