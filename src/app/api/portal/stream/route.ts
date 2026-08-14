import { requireClient } from "@/server/guards";
import { toApiErrorResponse } from "@/server/api";
import { grantedWorkIds } from "@/server/portal";
import { subscribe, type LiveEvent } from "@/server/events";

export const dynamic = "force-dynamic";

/**
 * Duración máxima de una conexión (feature 059).
 *
 * El conjunto de proyectos otorgados se captura al conectar, así que una revocación
 * seguiría emitiendo hasta que la conexión se corte. Cerrarla cada 15 minutos hace
 * que el navegador reconecte y vuelva a autorizarse: barato y suficiente.
 */
const MAX_CONNECTION_MS = 15 * 60_000;

/**
 * Flujo de eventos en vivo del portal (feature 059, FR-023).
 *
 * Endpoint propio en vez de filtrar /api/stream: los eventos llevan solo
 * identificadores, pero el broadcast global le revelaría a un cliente la existencia
 * y la tasa de actividad de todos los proyectos de la organización. Con un endpoint
 * aparte, el hub interno no se toca y no hay riesgo de regresión para el resto.
 */
export async function GET() {
  let granted: Set<string>;
  try {
    // Este handler devuelve un stream, así que no puede envolverse en withApi:
    // el error del guard se traduce a mano (si no, un rechazo sale como 500).
    const session = await requireClient();
    granted = await grantedWorkIds(session.user.id);
  } catch (err) {
    const known = toApiErrorResponse(err);
    if (known) return known;
    throw err;
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        if (!event.workId || !granted.has(event.workId)) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);
      const expiry = setTimeout(() => {
        cleanup();
        controller.close();
      }, MAX_CONNECTION_MS);

      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
        clearTimeout(expiry);
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
