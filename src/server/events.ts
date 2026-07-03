/**
 * Hub SSE (FR-036): toda vista abierta se suscribe a /api/stream y re-consulta
 * cuando un evento toca lo que muestra. Los eventos llevan solo IDs; el filtrado
 * fino por permisos ocurre al re-consultar la API correspondiente.
 */

export type LiveEvent =
  | { type: "task-changed"; taskId: string; workId: string | null; sectorIds: string[] }
  | { type: "work-changed"; workId: string };

type Subscriber = (event: LiveEvent) => void;

const globalForEvents = globalThis as unknown as { __gwSubscribers?: Set<Subscriber> };
const subscribers = (globalForEvents.__gwSubscribers ??= new Set<Subscriber>());

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function emit(event: LiveEvent): void {
  for (const fn of subscribers) {
    try {
      fn(event);
    } catch {
      subscribers.delete(fn);
    }
  }
}
