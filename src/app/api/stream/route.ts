import { requireInternal } from "@/server/guards";
import { toApiErrorResponse } from "@/server/api";
import { subscribe, type LiveEvent } from "@/server/events";

export const dynamic = "force-dynamic";

/** SSE global (FR-036): eventos con IDs; heartbeat cada 30 s. */
export async function GET() {
  // Este handler no puede envolverse en withApi (devuelve un stream, no JSON), así
  // que traduce a mano el error del guard: sin esto un rechazo salía como 500.
  try {
    await requireInternal();
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);

      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
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
