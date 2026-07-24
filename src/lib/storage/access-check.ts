/**
 * Control de acceso para las operaciones de archivos en la nube (feature 051).
 *
 * FR-005: toda operación sobre archivos de un trabajo se autoriza con el mismo
 * motor de permisos que el resto del dominio (grupo/sector/personal) — se deniega
 * ANTES de tocar el proveedor de almacenamiento.
 * FR-007: todo `path` recibido del cliente se normaliza y confina dentro de la
 * carpeta raíz del trabajo; cualquier intento de escapar responde `INVALID_PATH`.
 *
 * Los códigos de error (`FORBIDDEN`, `INVALID_PATH`) están documentados en
 * specs/051-gestion-archivos-nube/contracts/files-crud-and-identity.md.
 */

import { prisma } from "@/lib/db/client";
import { ApiError, forbidden } from "@/server/api";
import { notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { access, type Access, type UserContext } from "@/lib/domain/permissions";

/** Nivel de acceso mínimo requerido por la operación. */
export type RequiredAccess = "read" | "operate";

export interface WorkAccessResult {
  work: {
    id: string;
    groupId: string | null;
    ownerId: string | null;
    nextcloudFolderPath: string | null;
    folderSeq: number;
  };
  /** Nivel efectivo del usuario sobre el trabajo. */
  level: Access;
}

/**
 * Valida que `userId` tenga acceso al trabajo `workId` reutilizando el motor de
 * permisos existente (`getUserContext` + `access`). Deniega ANTES de tocar el
 * proveedor de almacenamiento (FR-005).
 *
 * - Lanza `NOT_FOUND` (404) si el trabajo no existe.
 * - Lanza `FORBIDDEN` (403) si el usuario no alcanza el nivel `require` pedido
 *   (`read` por defecto; las operaciones de escritura exigen `operate`).
 */
export async function assertWorkAccess(
  userId: string,
  workId: string,
  require: RequiredAccess = "read",
): Promise<WorkAccessResult> {
  const ctx = await getUserContext(userId);
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound("El trabajo no existe");

  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });

  if (level === "none") {
    throw forbidden("No tenés acceso a los archivos de este trabajo");
  }
  if (require === "operate" && level !== "operate") {
    throw forbidden("Solo podés ver los archivos de este trabajo, no modificarlos");
  }

  return {
    work: {
      id: work.id,
      groupId: work.groupId,
      ownerId: work.ownerId,
      nextcloudFolderPath: work.nextcloudFolderPath,
      folderSeq: work.folderSeq,
    },
    level,
  };
}

/**
 * Guard de habilitación de la carpeta de storage de un trabajo (feature 054, D4).
 *
 * Puede habilitar: SUPERADMIN, ADMIN del grupo del work (`GroupMembership.role
 * = ADMIN`), o el dueño si el work es personal (`groupId` null → `ownerId`).
 * Función pura sobre el `UserContext` ya cargado — la reutilizan el endpoint
 * `POST /api/works/[id]/files/enable` y el `canEnableFolder` del GET de files.
 */
export function canEnableWorkFolder(
  ctx: UserContext,
  work: { groupId: string | null; ownerId: string | null },
): boolean {
  if (ctx.globalRole === "SUPERADMIN") return true;
  if (work.groupId) return ctx.adminGroupIds.has(work.groupId);
  return work.ownerId != null && work.ownerId === ctx.id;
}

/** Error 400 con el código de contrato `INVALID_PATH` (FR-007). */
export function invalidPath(msg = "Ruta de archivo inválida"): ApiError {
  return new ApiError(400, "INVALID_PATH", msg);
}

/**
 * Normaliza y confina un `path` recibido del cliente dentro de `rootFolderPath`
 * (la carpeta del trabajo en el proveedor). Devuelve el path absoluto del
 * proveedor listo para usar.
 *
 * Rechaza con `INVALID_PATH` (FR-007) cualquier intento de escapar la carpeta:
 * segmentos `..`, paths absolutos, backslashes de Windows, bytes nulos.
 *
 * Un `clientPath` vacío/ausente resuelve a la raíz del trabajo.
 */
export function confineWorkPath(rootFolderPath: string, clientPath: string | null | undefined): string {
  const root = rootFolderPath.replace(/\/+$/, "");

  if (clientPath == null) return root;

  // Rechazos duros antes de normalizar: bytes nulos, backslashes de Windows.
  if (clientPath.includes("\0") || clientPath.includes("\\")) {
    throw invalidPath();
  }

  const trimmed = clientPath.trim();
  if (trimmed === "") return root;

  // Path absoluto: el cliente solo puede referirse a rutas relativas a su carpeta.
  if (trimmed.startsWith("/")) {
    throw invalidPath("No se permiten rutas absolutas");
  }

  const resolved: string[] = [];
  for (const segment of trimmed.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      throw invalidPath("La ruta no puede salir de la carpeta del trabajo");
    }
    resolved.push(segment);
  }

  const full = resolved.length > 0 ? `${root}/${resolved.join("/")}` : root;

  // Salvaguarda final: el path resuelto debe seguir dentro de la raíz.
  if (full !== root && !full.startsWith(`${root}/`)) {
    throw invalidPath();
  }

  return full;
}
