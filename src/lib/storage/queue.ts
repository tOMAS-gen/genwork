/**
 * Cola de aprovisionamiento Nextcloud (research R6): jobs idempotentes con
 * reintentos y backoff exponencial (máx 10 intentos). Nextcloud caído no
 * bloquea a genwork; los FAILED quedan visibles en el panel admin.
 */

import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "./index";
import { formatFolderName } from "./paths";
import { permissionAudit } from "./permissionAudit";
import type { JobKind, Prisma } from "@prisma/client";

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 5_000;
// Reprogramación corta (igual al ciclo del ticker) para jobs cuya dependencia
// asíncrona todavía no está lista — no consume presupuesto de intentos.
const DEPENDENCY_RETRY_MS = 30_000;

export type JobPayload =
  | { kind: "CREATE_USER"; userId: string; email: string; displayName: string }
  | { kind: "CREATE_GROUP_FOLDER"; groupId: string; groupName: string }
  | { kind: "ADD_MEMBER"; groupId: string; userId: string }
  | { kind: "REMOVE_MEMBER"; groupId: string; userId: string }
  | {
      kind: "CREATE_WORK_FOLDER";
      workId: string;
      workName: string;
      groupId: string | null;
      ownerUserId: string | null;
    }
  | { kind: "DELETE_WORK_FOLDER"; folderPath: string }
  | { kind: "MOVE_WORK_FOLDER"; workId: string; fromPath: string; toPath: string }
  | { kind: "RENAME_WORK_FOLDER"; workId: string; fromPath: string; toPath: string }
  | { kind: "AUDIT_GROUP_PERMISSIONS"; groupId: string };

export async function enqueue(payload: JobPayload): Promise<void> {
  await prisma.provisioningJob.create({
    data: {
      kind: payload.kind as JobKind,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
  // Intento inmediato sin bloquear la request
  void processPending().catch(() => {});
}

class StorageUnavailableError extends Error {}
/**
 * El job depende de otro job asíncrono que todavía no terminó (p. ej. la
 * carpeta del grupo o la cuenta Nextcloud del usuario aún no existen). NO es
 * un fallo real: se reprograma con un `runAfter` corto sin consumir intentos
 * (research.md R1). Distinto de un error genérico, que sí cuenta como intento.
 */
class DependencyNotReadyError extends Error {}

async function runJob(payload: JobPayload): Promise<void> {
  const storage = await getStorageProvider();
  if (!storage) throw new StorageUnavailableError("Storage no configurado");

  switch (payload.kind) {
    case "CREATE_USER": {
      const { storageUserId } = await storage.provisionUser(payload);
      await prisma.user.update({
        where: { id: payload.userId },
        data: { nextcloudUserId: storageUserId },
      });
      return;
    }
    case "CREATE_GROUP_FOLDER": {
      const { storageGroupId, storageFolderId } = await storage.createGroupFolder(payload);
      await prisma.group.update({
        where: { id: payload.groupId },
        data: { nextcloudGroupId: storageGroupId, nextcloudFolderId: storageFolderId },
      });
      // El owner entra a la carpeta compartida
      const group = await prisma.group.findUniqueOrThrow({ where: { id: payload.groupId } });
      await enqueue({ kind: "ADD_MEMBER", groupId: payload.groupId, userId: group.ownerId });
      return;
    }
    case "ADD_MEMBER":
    case "REMOVE_MEMBER": {
      const [group, user] = await Promise.all([
        prisma.group.findUniqueOrThrow({ where: { id: payload.groupId } }),
        prisma.user.findUniqueOrThrow({ where: { id: payload.userId } }),
      ]);
      if (!group.nextcloudGroupId) throw new DependencyNotReadyError("Grupo sin carpeta Nextcloud aún (reintentar)");
      if (!user.nextcloudUserId) throw new DependencyNotReadyError("Usuario sin cuenta Nextcloud aún (reintentar)");
      const input = { storageGroupId: group.nextcloudGroupId, storageUserId: user.nextcloudUserId };
      if (payload.kind === "ADD_MEMBER") await storage.addMember(input);
      else await storage.removeMember(input);
      return;
    }
    case "CREATE_WORK_FOLDER": {
      // Trabajo borrado antes de correr el job: no hay carpeta que crear
      const work = await prisma.work.findUnique({ where: { id: payload.workId } });
      if (!work) return;
      // Defensa ante jobs viejos encolados antes del flujo de carpetas bajo
      // demanda (research.md D10): sin habilitación explícita, no se crea
      // carpeta.
      if (!work.folderEnabledAt) return;
      const folderName = formatFolderName(work.folderSeq, payload.workName);
      let scope: { groupName: string } | { personalStorageUserId: string };
      if (payload.groupId) {
        const group = await prisma.group.findUniqueOrThrow({ where: { id: payload.groupId } });
        scope = { groupName: group.name };
      } else {
        const owner = await prisma.user.findUniqueOrThrow({
          where: { id: payload.ownerUserId! },
        });
        if (!owner.nextcloudUserId) throw new Error("Dueño sin cuenta Nextcloud aún (reintentar)");
        scope = { personalStorageUserId: owner.nextcloudUserId };
      }
      const { folderPath } = await storage.createWorkFolder({
        scope,
        workName: folderName,
      });
      await prisma.work.update({
        where: { id: payload.workId },
        data: { nextcloudFolderPath: folderPath },
      });
      return;
    }
    case "DELETE_WORK_FOLDER": {
      // Sin path no hay nada que borrar (job viejo/mal formado): skip limpio
      // (research.md D10).
      if (!payload.folderPath) return;
      await storage.deleteFolder(payload.folderPath);
      return;
    }
    case "MOVE_WORK_FOLDER":
    case "RENAME_WORK_FOLDER": {
      // Work borrado o sin carpeta (nunca habilitada, o job viejo encolado
      // antes de las carpetas bajo demanda): nada que mover/renombrar, sin
      // llamar al provider (research.md D10, FR-008).
      const work = await prisma.work.findUnique({
        where: { id: payload.workId },
        select: { nextcloudFolderPath: true },
      });
      if (!work?.nextcloudFolderPath) return;
      await storage.moveFolder(payload.fromPath, payload.toPath);
      // updateMany: si el trabajo fue borrado entre el enqueue y el job, no falla
      await prisma.work.updateMany({
        where: { id: payload.workId },
        data: { nextcloudFolderPath: payload.toPath },
      });
      return;
    }
    case "AUDIT_GROUP_PERMISSIONS": {
      // Grupo borrado entre el encolado y la ejecución: nada que auditar
      const group = await prisma.group.findUnique({ where: { id: payload.groupId } });
      if (!group) return;
      // Grupo todavía sin carpeta Nextcloud: nada que auditar todavía
      if (!group.nextcloudGroupId) return;
      const diff = await permissionAudit(payload.groupId, storage, group.nextcloudGroupId);
      if (diff) throw new Error(diff);
      return;
    }
  }
}

let processing = false;

export async function processPending(): Promise<void> {
  if (processing) return; // un solo worker por proceso
  processing = true;
  try {
    for (;;) {
      const job = await prisma.provisioningJob.findFirst({
        where: { status: "PENDING", runAfter: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
      });
      if (!job) break;

      // Altas/bajas rápidas del mismo usuario en el mismo grupo: el job más
      // reciente manda (spec.md Edge Cases). Si ya hay un ADD/REMOVE_MEMBER
      // PENDING más nuevo para el mismo (groupId, userId), descartar este sin
      // ejecutarlo para que no deje el estado final invertido.
      if (job.kind === "ADD_MEMBER" || job.kind === "REMOVE_MEMBER") {
        const { groupId, userId } = job.payload as { groupId: string; userId: string };
        const newer = await prisma.provisioningJob.findFirst({
          where: {
            id: { not: job.id },
            status: "PENDING",
            kind: { in: ["ADD_MEMBER", "REMOVE_MEMBER"] },
            createdAt: { gt: job.createdAt },
            AND: [
              { payload: { path: ["groupId"], equals: groupId } },
              { payload: { path: ["userId"], equals: userId } },
            ],
          },
        });
        if (newer) {
          await prisma.provisioningJob.update({
            where: { id: job.id },
            data: { status: "DONE", lastError: null },
          });
          continue;
        }
      }

      try {
        await runJob({ kind: job.kind, ...(job.payload as object) } as JobPayload);
        await prisma.provisioningJob.update({
          where: { id: job.id },
          data: { status: "DONE", lastError: null },
        });
      } catch (err) {
        // Dependencia asíncrona todavía no lista: reprogramar corto SIN
        // incrementar attempts ni arriesgar FAILED prematuro (research.md R1).
        // El conteo normal de intentos se retoma cuando la dependencia se
        // resuelva y el fallo persista por otra razón.
        if (err instanceof DependencyNotReadyError) {
          await prisma.provisioningJob.update({
            where: { id: job.id },
            data: {
              attempts: job.attempts,
              status: "PENDING",
              lastError: (err as Error).message,
              runAfter: new Date(Date.now() + DEPENDENCY_RETRY_MS),
            },
          });
          break; // dejar que el próximo tick lo retome
        }
        const storageUnavailable = err instanceof StorageUnavailableError;
        const attempts = storageUnavailable ? MAX_ATTEMPTS : job.attempts + 1;
        const failed = storageUnavailable || attempts >= MAX_ATTEMPTS;
        await prisma.provisioningJob.update({
          where: { id: job.id },
          data: {
            attempts,
            status: failed ? "FAILED" : "PENDING",
            lastError: (err as Error).message,
            runAfter: new Date(Date.now() + BASE_DELAY_MS * 2 ** Math.min(attempts, 8)),
          },
        });
        if (!failed) break; // backoff: dejar que el próximo tick lo retome
      }
    }
  } finally {
    processing = false;
  }
}

/** Reencola un job FAILED (acción del super-admin en el panel). */
export async function retryJob(jobId: string): Promise<void> {
  await prisma.provisioningJob.update({
    where: { id: jobId },
    data: { status: "PENDING", attempts: 0, runAfter: new Date() },
  });
  void processPending().catch(() => {});
}

// Tick periódico dentro del proceso del server (instrumentation lo inicia)
let ticker: ReturnType<typeof setInterval> | null = null;
export function startQueueTicker(): void {
  if (ticker) return;
  ticker = setInterval(() => void processPending().catch(() => {}), 30_000);
  ticker.unref?.();
}

const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Encola un `AUDIT_GROUP_PERMISSIONS` por cada grupo con carpeta Nextcloud
 * (`nextcloudGroupId` no nulo). No duplica: si ya hay un job `PENDING` de
 * ese kind para el mismo grupo, lo salta (mismo criterio de idempotencia
 * que `migrateWorkFolderNames`, ver folderNameMigration.ts).
 */
export async function enqueuePermissionAudits(): Promise<void> {
  const groups = await prisma.group.findMany({
    where: { nextcloudGroupId: { not: null } },
    select: { id: true },
  });

  for (const group of groups) {
    const existing = await prisma.provisioningJob.findFirst({
      where: {
        kind: "AUDIT_GROUP_PERMISSIONS",
        status: "PENDING",
        payload: { path: ["groupId"], equals: group.id },
      },
    });
    if (existing) continue;

    await enqueue({ kind: "AUDIT_GROUP_PERMISSIONS", groupId: group.id });
  }
}

// Tick diario de auditoría de permisos (research.md R3, FR-008). Variable de
// módulo separada de `ticker` — guard independiente contra doble arranque.
let permissionAuditTicker: ReturnType<typeof setInterval> | null = null;
export function startPermissionAuditTicker(): void {
  if (permissionAuditTicker) return;
  permissionAuditTicker = setInterval(
    () => void enqueuePermissionAudits().catch(() => {}),
    AUDIT_INTERVAL_MS,
  );
  permissionAuditTicker.unref?.();
}
