export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueueTicker } = await import("@/lib/storage/queue");
    startQueueTicker();
  }
}
