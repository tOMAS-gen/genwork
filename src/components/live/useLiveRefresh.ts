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
 *
 * `options.url` (feature 059) permite apuntar al flujo del portal de cliente, que
 * es un endpoint aparte porque filtra los eventos por proyecto otorgado. Por
 * omisión sigue siendo el flujo interno, así que los llamadores actuales no cambian.
 */
export function useLiveRefresh(
  onChange: () => void,
  watch?: { workId?: string; sectorId?: string },
  options?: { url?: string },
) {
  const url = options?.url ?? "/api/stream";
  useEffect(() => {
    const source = new EventSource(url);
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
  }, [watch?.workId, watch?.sectorId, url]);
}
