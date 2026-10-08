import { ApiError, badRequest, conflict } from "@/server/api";
import { getStorageProvider } from "@/lib/storage";
import { assertWorkAccess, resolveWorkPath } from "@/lib/storage/access-check";
import type { StorageProvider } from "@/lib/storage/provider";

/** Tope del nombre de archivo (Drive y Nextcloud aceptan hasta 255). */
const MAX_FILE_NAME = 255;

/**
 * Destino de una subida al visor de archivos de un proyecto: valida permiso de
 * operar (antes de tocar el proveedor, FR-005), que la carpeta exista y confina
 * la subcarpeta navegada (`clientPath`) dentro de la del proyecto (FR-007).
 */
export async function resolveUploadTarget(
  userId: string,
  workId: string,
  clientPath: string | null | undefined,
): Promise<{ storage: StorageProvider; folderPath: string }> {
  const { work } = await assertWorkAccess(userId, workId, "operate");
  if (!work.nextcloudFolderPath) {
    throw conflict("La carpeta del proyecto todavía no está lista; reintentá en unos segundos");
  }
  const storage = await getStorageProvider();
  if (!storage) throw new ApiError(404, "STORAGE_UNAVAILABLE", "Almacenamiento no configurado");
  const folderPath = await resolveWorkPath(storage, work.nextcloudFolderPath, clientPath);
  return { storage, folderPath };
}

/** Nombre de archivo recibido del cliente, validado. */
export function uploadFileName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) throw badRequest("Falta el nombre del archivo");
  if (name.length > MAX_FILE_NAME) throw badRequest("El nombre del archivo es demasiado largo");
  if (name.includes("\0")) throw badRequest("Nombre de archivo inválido");
  return name;
}
