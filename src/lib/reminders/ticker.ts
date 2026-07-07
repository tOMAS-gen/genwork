/**
 * ticker.ts — tick periódico del motor de recordatorios (research R1).
 * Mismo patrón que src/lib/storage/queue.ts (setInterval 30s + unref), pero
 * arranca SIEMPRE en runtime nodejs (independiente de NEXTCLOUD_URL).
 */

import { tick } from "./engine";

let ticker: ReturnType<typeof setInterval> | null = null;

export function startReminderTicker(): void {
  if (ticker) return;
  // Primer tick al arrancar, luego cada 30s.
  void tick().catch(() => {});
  ticker = setInterval(() => void tick().catch(() => {}), 30_000);
  ticker.unref?.();
}
