/**
 * NextcloudProvider — implementación v1 de StorageProvider (research R6).
 *
 * Diseño: la cuenta de servicio admin es dueña de la estructura de carpetas.
 * Con `GENWORK_ORG` definida (raíz por empresa, ver `root.ts`):
 *   /GENWORK_{EMPRESA}/{GRUPO}/{PROYECTO_007}  → compartida con el grupo Nextcloud
 *   /GENWORK_{EMPRESA}/{email}/{PROYECTO_007}  → compartida solo con ese usuario
 *   /GENWORK_{EMPRESA}/_archivados/…           → misma organización, proyectos archivados
 * Sin `GENWORK_ORG` (instalaciones previas):
 *   /genwork/{grupo}/{trabajo}, /genwork-personal/{usuario}/{trabajo}
 * Compartir por grupo cubre las altas/bajas de miembros automáticamente vía la
 * membresía del grupo Nextcloud (FR-034/035). Todas las operaciones son idempotentes:
 * los reintentos de la cola no duplican recursos.
 */

import { createClient, type WebDAVClient, type FileStat } from "webdav";
import { Readable } from "node:stream";
import type {
  NextcloudConfig,
  StorageFileInfo,
  StorageProvider,
  WorkFolderScope,
} from "./provider";
import { folderSegment, sanitizeSegment } from "./paths";
import { storageRootName } from "./root";
import { nextcloudPublicUrl } from "./nextcloud-url";

const SHARE_TYPE_USER = 0;
const SHARE_TYPE_GROUP = 1;
const PERM_ALL = 31; // read+update+create+delete+share

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

  /** Montajes de shares que ve el usuario: file id → ruta en su raíz. Uno por instancia (request). */
  private userMounts?: Promise<Map<string, string>>;

  /**
   * Operación "as user" (FR-011): la cuenta del usuario no ve la estructura del
   * admin (`/GENWORK_GEN/VENTAS/...`) sino cada share montado en SU raíz
   * (`file_target`, que puede llevar sufijo " (2)" si choca con otra carpeta).
   * Traduce buscando, de arriba hacia abajo, el ancestro compartido por file id.
   * Devuelve la ruta a usar y cómo volver a la ruta del admin. Como admin, no
   * traduce. Sin share que cubra la ruta → `StorageNotFoundError`.
   */
  private async userView(adminPath: string): Promise<{ path: string; toAdmin: (p: string) => string }> {
    if (!this.cfg.userCredential) return { path: adminPath, toAdmin: (p) => p };
    this.userMounts ??= this.loadUserMounts();
    const mounts = await this.userMounts;
    const segments = adminPath.split("/").filter(Boolean);
    for (let i = 1; i <= segments.length; i++) {
      const prefix = `/${segments.slice(0, i).join("/")}`;
      const fileId = await this.adminFileId(prefix);
      const target = fileId ? mounts.get(fileId) : undefined;
      if (target) {
        return {
          path: target + adminPath.slice(prefix.length),
          toAdmin: (p) => prefix + p.slice(target.length),
        };
      }
    }
    throw new StorageNotFoundError(`Sin acceso en la nube a "${adminPath}"`);
  }

  private async loadUserMounts(): Promise<Map<string, string>> {
    const { data } = await this.ocs(
      "GET",
      "/ocs/v2.php/apps/files_sharing/api/v1/shares?shared_with_me=true",
    );
    const list = (data as { ocs?: { data?: unknown } })?.ocs?.data;
    const mounts = new Map<string, string>();
    if (Array.isArray(list)) {
      for (const share of list as { file_source?: number | string; file_target?: string }[]) {
        if (share.file_source != null && share.file_target) {
          mounts.set(String(share.file_source), share.file_target.replace(/\/+$/, ""));
        }
      }
    }
    return mounts;
  }

  /**
   * Link para abrir una carpeta en la web de Nextcloud. Se usa el link por id
   * (`/f/{fileid}`): la ruta del admin (`/genwork/{grupo}/…`) no es la que ve
   * cada usuario, que tiene la carpeta compartida montada en otro lado.
   */
  async webUrl(path: string): Promise<string | null> {
    const base = nextcloudPublicUrl(this.cfg.url);
    if (!base) return null;
    const fileId = await this.adminFileId(path).catch(() => null);
    return fileId ? `${base}/f/${fileId}` : `${base}/apps/files/?dir=${encodeURIComponent(path)}`;
  }

  /** File id de una ruta del admin (PROPFIND con la cuenta admin), o null si no existe. */
  private async adminFileId(path: string): Promise<string | null> {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(
      `${this.cfg.url.replace(/\/$/, "")}/remote.php/dav/files/${encodeURIComponent(this.cfg.adminUser)}${encoded}`,
      {
        method: "PROPFIND",
        headers: {
          Depth: "0",
          "Content-Type": "application/xml",
          Authorization:
            "Basic " + Buffer.from(`${this.cfg.adminUser}:${this.cfg.adminPassword}`).toString("base64"),
        },
        body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>',
      },
    );
    if (res.status !== 207) return null;
    return /<oc:fileid>(\d+)<\/oc:fileid>/.exec(await res.text())?.[1] ?? null;
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
    const folderPath = this.groupFolderPath(input.groupName);
    await this.ensureDir(folderPath);
    await this.shareWith(folderPath, storageGroupId, SHARE_TYPE_GROUP);
    return { storageGroupId, storageFolderId: folderPath };
  }

  /** Carpeta del grupo: bajo la raíz de la empresa o, sin ella, bajo `/genwork`. */
  private groupFolderPath(groupName: string): string {
    const root = storageRootName();
    return root
      ? `/${root}/${folderSegment(groupName)}`
      : `/genwork/${sanitizeSegment(groupName)}`;
  }

  async shareScopeFolder(input: { path: string; scope: WorkFolderScope }): Promise<void> {
    await this.ensureDir(input.path);
    if ("groupName" in input.scope) {
      if (input.scope.storageGroupId) {
        await this.shareWith(input.path, input.scope.storageGroupId, SHARE_TYPE_GROUP);
      }
    } else {
      await this.shareWith(input.path, input.scope.personalStorageUserId, SHARE_TYPE_USER);
    }
  }

  /** Primer path libre: `base`, `base-2`, `base-3`… (red de seguridad ante carpetas creadas a mano). */
  private async freePath(base: string): Promise<string> {
    if (!(await this.dav.exists(base))) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!(await this.dav.exists(candidate))) return candidate;
    }
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

  async createWorkFolder(input: { scope: WorkFolderScope; workName: string }) {
    const root = storageRootName();
    let container: string;
    if ("groupName" in input.scope) {
      container = this.groupFolderPath(input.scope.groupName);
    } else {
      container = root
        ? `/${root}/${sanitizeSegment(input.scope.personalEmail.toLowerCase())}`
        : `/genwork-personal/${sanitizeSegment(input.scope.personalStorageUserId)}`;
    }
    // Idempotente (403 = ya compartida): garantiza el acceso aunque la carpeta
    // del ámbito se haya creado recién (raíz nueva o grupo renombrado).
    await this.shareScopeFolder({ path: container, scope: input.scope });
    const folderPath = await this.freePath(`${container}/${sanitizeSegment(input.workName)}`);
    await this.ensureDir(folderPath);
    return { folderPath };
  }

  async upload(input: { folderPath: string; fileName: string; data: Buffer | Readable }) {
    const filePath = `${input.folderPath}/${sanitizeSegment(input.fileName)}`;
    await this.ensureDir(input.folderPath);
    await this.dav.putFileContents(filePath, input.data, { overwrite: true });
    return { filePath };
  }

  async read(filePath: string): Promise<Readable> {
    const { path } = await this.userView(filePath);
    const stream = this.dav.createReadStream(path);
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
    const view = await this.userView(input.folderPath);
    const path = `${view.path}/${name}`;
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
    return { path: view.toAdmin(path) };
  }

  async rename(input: { path: string; newName: string }): Promise<{ path: string }> {
    const view = await this.userView(input.path);
    if (!(await this.dav.exists(view.path))) {
      throw new StorageNotFoundError(`No existe "${input.path}"`);
    }
    const name = sanitizeSegment(input.newName);
    const target = `${view.path.substring(0, view.path.lastIndexOf("/"))}/${name}`;
    if (target === view.path) return { path: input.path };
    if (await this.dav.exists(target)) {
      throw new StorageAlreadyExistsError(`Ya existe "${name}" en esta carpeta`);
    }
    await this.dav.moveFile(view.path, target);
    return { path: view.toAdmin(target) };
  }

  /**
   * FR-003: elimina un archivo o carpeta (recursivo si es carpeta — Nextcloud
   * borra el árbol completo del lado del servidor en una sola llamada WebDAV,
   * no hace falta recorrerlo a mano). Si `path` no existe, falla con
   * `StorageNotFoundError` (código `NOT_FOUND`) en vez de no-opear en silencio.
   */
  async delete(adminPath: string): Promise<void> {
    const { path } = await this.userView(adminPath);
    if (!(await this.dav.exists(path))) {
      throw new StorageNotFoundError(`No existe "${adminPath}"`);
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
    const { path } = await this.userView(input.path);
    const body: Record<string, string> = {
      path,
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
