export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Cola de aprovisionamiento (solo si hay Nextcloud configurado).
    if (process.env.NEXTCLOUD_URL) {
      const { startQueueTicker, startPermissionAuditTicker } = await import("@/lib/storage/queue");
      startQueueTicker();
      startPermissionAuditTicker();
      // Migración de una pasada: normaliza a minúsculas los nombres de carpeta
      // ya existentes (FR-007). No debe tumbar el arranque si falla.
      try {
        const { migrateWorkFolderNames } = await import("@/lib/storage/folderNameMigration");
        await migrateWorkFolderNames();
      } catch (err) {
        console.error("[folderNameMigration] falló la migración de nombres de carpeta:", err);
      }
    }
    // Motor de recordatorios: arranca siempre (feature 036, R1).
    const { startReminderTicker } = await import("@/lib/reminders/ticker");
    startReminderTicker();
  }
}
