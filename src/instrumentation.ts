export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Cola de aprovisionamiento (solo si hay Nextcloud configurado).
    if (process.env.NEXTCLOUD_URL) {
      const { startQueueTicker } = await import("@/lib/storage/queue");
      startQueueTicker();
    }
    // Motor de recordatorios: arranca siempre (feature 036, R1).
    const { startReminderTicker } = await import("@/lib/reminders/ticker");
    startReminderTicker();
  }
}
