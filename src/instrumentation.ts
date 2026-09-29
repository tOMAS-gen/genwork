export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Cola de aprovisionamiento: arranca siempre (el proveedor puede estar
    // configurado solo en la base, p. ej. Google Drive); sin proveedor, los
    // jobs fallan igual que en el intento inmediato de `enqueue`.
    const { startQueueTicker, startPermissionAuditTicker } = await import("@/lib/storage/queue");
    startQueueTicker();
    // La auditoría de permisos compara grupos Nextcloud: solo con Nextcloud.
    if (process.env.NEXTCLOUD_URL) startPermissionAuditTicker();
    // Motor de recordatorios: arranca siempre (feature 036, R1).
    const { startReminderTicker } = await import("@/lib/reminders/ticker");
    startReminderTicker();
  }
}
