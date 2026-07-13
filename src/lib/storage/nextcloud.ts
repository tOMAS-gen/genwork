/**
 * NextcloudProvider — implementación v1 de StorageProvider (research R6).
 *
 * Diseño: la cuenta de servicio admin es dueña de la estructura de carpetas:
 *   /genwork/{grupo}/{trabajo}         → compartida con el grupo Nextcloud (sync para miembros)
 *   /genwork-personal/{usuario}/{trabajo} → compartida solo con ese usuario
 * Compartir por grupo cubre las altas/bajas de miembros automáticamente vía la
 * membresía del grupo Nextcloud (FR-034/035). Todas las operaciones son idempotentes:
 * los reintentos de la cola no duplican recursos.
 */

import { createClient, type WebDAVClient, type FileStat } from "webdav";
import { Readable } from "node:stream";
import type { NextcloudConfig, StorageFileInfo, StorageProvider } from "./provider";

const SHARE_TYPE_USER = 0;
const SHARE_TYPE_GROUP = 1;
const PERM_ALL = 31; // read+update+create+delete+share

function sanitizeSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

/**
 * Error reconocible para FR-001: `createFolder` es una acción explícita del
 * usuario ("crear carpeta nueva"), a diferencia de `ensureDir` (interno,
 * idempotente) no debe ser un no-op silencioso si el nombre ya existe en ese
 * nivel. La capa de API (contracts/files-crud-and-identity.md) mapea esto a
 * `409 ALREADY_EXISTS` chequeando `err.code`.
 */
export class StorageAlreadyExistsError extends Error {
  code = "ALREADY_EXISTS" as const;
  constructor(message = "Ya existe un archivo o carpeta con ese nombre en esta ubicación") {
    super(message);
    this.name = "StorageAlreadyExistsError";
  }
}

/**
 * Error reconocible para FR-003: `delete` sobre un `path` inexistente no debe
 * ser un no-op silencioso. La capa de API (contracts/files-crud-and-identity.md)
 * mapea esto a `404 NOT_FOUND` chequeando `err.code`.
 */
export class StorageNotFoundError extends Error {
  code = "NOT_FOUND" as const;
  constructor(message = "El archivo o carpeta no existe") {
    super(message);
    this.name = "StorageNotFoundError";
  }
}

export class NextcloudProvider implements StorageProvider {
  private dav: WebDAVClient;
  /**
   * Usuario/clave con los que se autentican las llamadas WebDAV/OCS. Si la config
   * trae `userCredential` (operación interactiva, FR-011) se opera "as user" con
   * su login + app password; si no, se usa la cuenta admin (uso de sistema).
   */
  private authUser: string;
  private authPassword: string;

  constructor(private cfg: NextcloudConfig) {
    this.authUser = cfg.userCredential?.nextcloudLoginName ?? cfg.adminUser;
    this.authPassword = cfg.userCredential?.nextcloudAppPassword ?? cfg.adminPassword;
    this.dav = createClient(`${cfg.url.replace(/\/$/, "")}/remote.php/dav/files/${this.authUser}`, {
      username: this.authUser,
      password: this.authPassword,
    });
  }

  private async ocs(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, string>,
  ): Promise<{ status: number; data: unknown }> {
    const url = `${this.cfg.url.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "OCS-APIRequest": "true",
        Accept: "application/json",
        Authorization:
          "Basic " +
          Buffer.from(`${this.authUser}:${this.authPassword}`).toString("base64"),
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* respuestas vacías */
    }
    return { status: res.status, data };
  }

  private ocsStatusCode(data: unknown): number | null {
    const meta = (data as { ocs?: { meta?: { statuscode?: number } } })?.ocs?.meta;
    return meta?.statuscode ?? null;
  }

  private async ensureDir(path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean);
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      if (!(await this.dav.exists(acc))) {
        try {
          await this.dav.createDirectory(acc);
        } catch (err) {
          // 405 = ya existe (carrera con otro reintento): idempotente
          if (!(await this.dav.exists(acc))) throw err;
        }
      }
    }
  }

  private async shareWith(path: string, withWho: string, shareType: number): Promise<void> {
    const { data } = await this.ocs("POST", "/ocs/v2.php/apps/files_sharing/api/v1/shares", {
      path,
      shareType: String(shareType),
      shareWith: withWho,
      permissions: String(PERM_ALL),
    });
    const code = this.ocsStatusCode(data);
    // 200 ok; 403 "ya compartido" → idempotente
    if (code !== null && code !== 200 && code !== 403) {
      throw new Error(`Nextcloud share failed (${code}) for ${path} → ${withWho}`);
    }
  }

  async provisionUser(input: { userId: string; email: string; displayName: string }) {
    const storageUserId = input.email;
    const { data } = await this.ocs("POST", "/ocs/v2.php/cloud/users", {
      userid: storageUserId,
      email: input.email,
      displayName: input.displayName,
      // sin password: Nextcloud envía mail de bienvenida para definirla (requiere SMTP);
      // el super-admin puede resetearla desde Nextcloud si no hay mail configurado.
    });
    const code = this.ocsStatusCode(data);
    // 100/200 creado; 102 ya existe → idempotente
    if (code !== null && ![100, 200, 102].includes(code)) {
      throw new Error(`Nextcloud provisionUser failed (${code}) for ${storageUserId}`);
    }
    return { storageUserId };
  }

  async createGroupFolder(input: { groupId: string; groupName: string }) {
    const storageGroupId = `gw-${sanitizeSegment(input.groupName)}`;
    const { data } = await this.ocs("POST", "/ocs/v2.php/cloud/groups", {
      groupid: storageGroupId,
    });
    const code = this.ocsStatusCode(data);
    if (code !== null && ![100, 200, 102].includes(code)) {
      throw new Error(`Nextcloud create group failed (${code}) for ${storageGroupId}`);
    }
    const folderPath = `/genwork/${sanitizeSegment(input.groupName)}`;
    await this.ensureDir(folderPath);
    await this.shareWith(folderPath, storageGroupId, SHARE_TYPE_GROUP);
    return { storageGroupId, storageFolderId: folderPath };
  }

  async addMember(input: { storageGroupId: string; storageUserId: string }) {
    const { data } = await this.ocs(
      "POST",
      `/ocs/v2.php/cloud/users/${encodeURIComponent(input.storageUserId)}/groups`,
      { groupid: input.storageGroupId },
    );
    const code = this.ocsStatusCode(data);
    if (code !== null && ![100, 200, 102, 105].includes(code)) {
      throw new Error(`Nextcloud addMember failed (${code})`);
    }
  }

  async removeMember(input: { storageGroupId: string; storageUserId: string }) {
    const { data } = await this.ocs(
      "DELETE",
      `/ocs/v2.php/cloud/users/${encodeURIComponent(input.storageUserId)}/groups?groupid=${encodeURIComponent(input.storageGroupId)}`,
    );
    const code = this.ocsStatusCode(data);
    if (code !== null && ![100, 200, 102, 105].includes(code)) {
      throw new Error(`Nextcloud removeMember failed (${code})`);
    }
  }

  async listGroupMembers(input: { storageGroupId: string }): Promise<{ storageUserId: string }[]> {
    const { data } = await this.ocs(
      "GET",
      `/ocs/v2.php/cloud/groups/${encodeURIComponent(input.storageGroupId)}`,
    );
    const code = this.ocsStatusCode(data);
    if (code !== null && code !== 100 && code !== 200) {
      throw new Error(`Nextcloud listGroupMembers failed (${code})`);
    }
    const users = (data as { ocs?: { data?: { users?: unknown } } })?.ocs?.data?.users;
    if (!Array.isArray(users)) return [];
    return users
      .filter((user): user is string => typeof user === "string")
      .map((storageUserId) => ({ storageUserId }));
  }

  async createWorkFolder(input: {
    scope: { groupName: string } | { personalStorageUserId: string };
    workName: string;
  }) {
    const work = sanitizeSegment(input.workName);
    let folderPath: string;
    if ("groupName" in input.scope) {
      folderPath = `/genwork/${sanitizeSegment(input.scope.groupName)}/${work}`;
      await this.ensureDir(folderPath);
    } else {
      const base = `/genwork-personal/${sanitizeSegment(input.scope.personalStorageUserId)}`;
      await this.ensureDir(base);
      await this.shareWith(base, input.scope.personalStorageUserId, SHARE_TYPE_USER);
      folderPath = `${base}/${work}`;
      await this.ensureDir(folderPath);
    }
    return { folderPath };
  }

  async upload(input: { folderPath: string; fileName: string; data: Buffer | Readable }) {
    const filePath = `${input.folderPath}/${sanitizeSegment(input.fileName)}`;
    await this.ensureDir(input.folderPath);
    await this.dav.putFileContents(filePath, input.data, { overwrite: true });
    return { filePath };
  }

  async read(filePath: string): Promise<Readable> {
    const stream = this.dav.createReadStream(filePath);
    return stream as unknown as Readable;
  }

  async list(folderPath: string): Promise<StorageFileInfo[]> {
    const items = (await this.dav.getDirectoryContents(folderPath, {
      deep: true,
    })) as FileStat[];
    return items.map((f) => ({
      name: f.basename,
      path: f.filename,
      size: f.size,
      isDirectory: f.type === "directory",
      lastModified: f.lastmod,
      mimeType: f.mime ?? (f.type === "directory" ? "httpd/unix-directory" : "application/octet-stream"),
    }));
  }

  async listShallow(folderPath: string, subpath?: string): Promise<StorageFileInfo[]> {
    const target = subpath ? `${folderPath}/${subpath}` : folderPath;
    if (!(await this.dav.exists(target))) return [];
    const items = (await this.dav.getDirectoryContents(target, {
      deep: false,
    })) as FileStat[];
    return items.map((f) => ({
      name: f.basename,
      path: f.filename,
      size: f.size,
      isDirectory: f.type === "directory",
      lastModified: f.lastmod,
      mimeType: f.mime ?? (f.type === "directory" ? "httpd/unix-directory" : "application/octet-stream"),
    }));
  }

  /**
   * FR-001: crea una carpeta hija dentro de `folderPath`. A diferencia de
   * `ensureDir`, NO es idempotente: si ya existe un archivo o carpeta con ese
   * nombre en ese nivel, falla con `StorageAlreadyExistsError` (código
   * `ALREADY_EXISTS`) en vez de no-opear en silencio.
   */
  async createFolder(input: { folderPath: string; name: string }): Promise<{ path: string }> {
    const name = sanitizeSegment(input.name);
    const path = `${input.folderPath}/${name}`;
    if (await this.dav.exists(path)) {
      throw new StorageAlreadyExistsError(`Ya existe "${name}" en esta carpeta`);
    }
    try {
      await this.dav.createDirectory(path);
    } catch (err) {
      // 405 = ya existe (carrera con otro pedido concurrente): sigue siendo
      // un conflicto explícito, no se traga el error como en ensureDir.
      if (await this.dav.exists(path)) {
        throw new StorageAlreadyExistsError(`Ya existe "${name}" en esta carpeta`);
      }
      throw err;
    }
    return { path };
  }

  /**
   * FR-003: elimina un archivo o carpeta (recursivo si es carpeta — Nextcloud
   * borra el árbol completo del lado del servidor en una sola llamada WebDAV,
   * no hace falta recorrerlo a mano). Si `path` no existe, falla con
   * `StorageNotFoundError` (código `NOT_FOUND`) en vez de no-opear en silencio.
   */
  async delete(path: string): Promise<void> {
    if (!(await this.dav.exists(path))) {
      throw new StorageNotFoundError(`No existe "${path}"`);
    }
    await this.dav.deleteFile(path);
  }

  /**
   * FR-004/FR-010: comparte un archivo o carpeta vía OCS Share API.
   * - `mode === "LINK"` → link público (`shareType` 3), con `password`/`expireDate`
   *   opcionales; devuelve `{ providerShareId, linkUrl }`.
   * - `mode === "INTERNAL"` → compartir con un usuario Nextcloud (`shareType` 0);
   *   `targetIdentity` debe venir ya resuelto como el `nextcloudLoginName` del
   *   destinatario (responsabilidad del caller). Devuelve `{ providerShareId }`.
   * El `id` OCS devuelto es el `providerShareId` que luego consume `unshare`.
   */
  async share(input: {
    path: string;
    mode: "LINK" | "INTERNAL";
    password?: string;
    expiresAt?: Date;
    targetIdentity?: string;
  }): Promise<{ providerShareId: string; linkUrl?: string }> {
    const SHARE_TYPE_LINK = 3;
    const body: Record<string, string> = {
      path: input.path,
      shareType: String(input.mode === "LINK" ? SHARE_TYPE_LINK : SHARE_TYPE_USER),
    };
    if (input.mode === "INTERNAL") {
      if (!input.targetIdentity) {
        throw new Error("Nextcloud share INTERNAL requiere targetIdentity");
      }
      body.shareWith = input.targetIdentity;
    }
    if (input.password) body.password = input.password;
    if (input.expiresAt) body.expireDate = input.expiresAt.toISOString().slice(0, 10);

    const { data } = await this.ocs(
      "POST",
      "/ocs/v2.php/apps/files_sharing/api/v1/shares",
      body,
    );
    const code = this.ocsStatusCode(data);
    if (code !== null && code !== 100 && code !== 200) {
      throw new Error(`Nextcloud share failed (${code}) for ${input.path}`);
    }
    const shareData = (data as { ocs?: { data?: { id?: unknown; url?: string } } })?.ocs?.data;
    const providerShareId = shareData?.id != null ? String(shareData.id) : null;
    if (!providerShareId) {
      throw new Error(`Nextcloud share sin id para ${input.path}`);
    }
    return {
      providerShareId,
      ...(input.mode === "LINK" && shareData?.url ? { linkUrl: shareData.url } : {}),
    };
  }

  /**
   * FR-004/FR-010: revoca un acceso compartido por su `providerShareId` (el `id`
   * OCS devuelto por `share`). Idempotente: si el share ya no existe (404), se
   * trata como éxito y no se lanza error.
   */
  async unshare(providerShareId: string): Promise<void> {
    const { status, data } = await this.ocs(
      "DELETE",
      `/ocs/v2.php/apps/files_sharing/api/v1/shares/${encodeURIComponent(providerShareId)}`,
    );
    const code = this.ocsStatusCode(data);
    // 100/200 revocado; 404 (HTTP u OCS) ya no existe → idempotente
    if (status === 404 || code === 404) return;
    if (code !== null && code !== 100 && code !== 200) {
      throw new Error(`Nextcloud unshare failed (${code}) for ${providerShareId}`);
    }
  }

  async moveFolder(from: string, to: string): Promise<void> {
    if (!(await this.dav.exists(from))) return;
    const toParent = to.substring(0, to.lastIndexOf("/"));
    await this.ensureDir(toParent);
    await this.dav.moveFile(from, to);
  }

  async deleteFolder(folderPath: string): Promise<void> {
    if (await this.dav.exists(folderPath)) {
      await this.dav.deleteFile(folderPath);
    }
  }

  async test(): Promise<{ ok: boolean; detail: string }> {
    try {
      const { status, data } = await this.ocs("GET", "/ocs/v2.php/cloud/capabilities");
      const code = this.ocsStatusCode(data);
      if (status === 200 && (code === 100 || code === 200)) {
        return { ok: true, detail: "Conexión y credenciales OK" };
      }
      return { ok: false, detail: `Respuesta inesperada (HTTP ${status}, OCS ${code})` };
    } catch (err) {
      return { ok: false, detail: `Sin conexión: ${(err as Error).message}` };
    }
  }
}
