/**
 * link.ts — resuelve el vínculo opcional de un recordatorio (Work/Sector/Task) a
 * una ruta navegable + label, e informa si el recurso todavía existe (vínculo roto).
 * Usado por el email y por la campanita.
 */

import { prisma } from "@/lib/db/client";
import type { ReminderLinkKind } from "@/lib/domain/reminders/types";

export interface ResolvedLink {
  available: boolean;
  path: string | null; // ruta relativa (ej. /works/<id>)
  label: string | null;
}

export async function resolveReminderLink(
  linkType: ReminderLinkKind | null,
  linkId: string | null,
): Promise<ResolvedLink | null> {
  if (!linkType || !linkId) return null;

  if (linkType === "WORK") {
    const work = await prisma.work.findUnique({ where: { id: linkId }, select: { name: true } });
    return { available: !!work, path: `/works/${linkId}`, label: work?.name ?? null };
  }
  if (linkType === "SECTOR") {
    const sector = await prisma.sector.findUnique({ where: { id: linkId }, select: { name: true } });
    return { available: !!sector, path: `/sectors/${linkId}`, label: sector?.name ?? null };
  }
  // TASK: las tareas viven dentro de un trabajo o sector; se navega a su contenedor.
  const task = await prisma.task.findUnique({
    where: { id: linkId },
    select: { displayText: true, workId: true, sectorId: true },
  });
  if (!task) return { available: false, path: null, label: null };
  const path = task.workId ? `/works/${task.workId}` : task.sectorId ? `/sectors/${task.sectorId}` : null;
  return { available: !!path, path, label: task.displayText };
}

/** Base URL absoluta de la app para enlaces en emails. */
export function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.APP_URL ||
    "http://localhost:3010"
  ).replace(/\/$/, "");
}
