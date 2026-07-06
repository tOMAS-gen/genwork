export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXTCLOUD_URL) {
    const { startQueueTicker } = await import("@/lib/storage/queue");
    startQueueTicker();
  }
}
