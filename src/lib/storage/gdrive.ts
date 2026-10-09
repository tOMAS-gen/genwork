/**
 * GoogleDriveProvider — implementación de StorageProvider sobre Google Drive
 * (feature 034). Modelo centralizado: la plataforma opera con la autorización
 * OAuth del administrador (refresh token) sobre un Shared Drive dedicado.
 *
 * A diferencia de Nextcloud, no hay cuentas espejo ni compartición por usuario:
 * el acceso lo intermedia la plataforma. Por eso `provisionUser`, `addMember` y
 * `removeMember` son no-op. El "path" de la interfaz se representa con el
 * **folderId/fileId** de Drive (opaco). Todas las llamadas usan
 * `supportsAllDrives=true` para operar dentro del Shared Drive.
 *
 * Sin dependencias npm: solo `fetch` contra la Drive API v3.
 */

import { Readable } from "node:stream";
import { getAccessToken } from "./google-auth";
import type {
  GoogleDriveConfig,
  StorageFileInfo,
  StorageProvider,
  WorkFolderScope,
} from "./provider";
import { ARCHIVE_FOLDER, folderSegment } from "./paths";
import { rootNameFor, storageRootName } from "./root";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
/** Tope de niveles al subir por `parents` para validar que un ID está dentro del trabajo. */
const MAX_FOLDER_DEPTH = 32;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

export class GoogleDriveProvider implements StorageProvider {
  constructor(private cfg: GoogleDriveConfig) {}

  private async token(): Promise<string> {
    // Operación interactiva (FR-011): si hay credencial propia del usuario, se
    // autentica con SU refresh token en vez del admin. El client_id/secret siguen
    // siendo los de la app (config base).
    const refreshToken = this.cfg.userCredential?.gdriveRefreshToken ?? this.cfg.refreshToken;
    return getAccessToken({
      clientId: this.cfg.clientId,
      clientSecret: this.cfg.clientSecret,
      refreshToken,
    });
  }

  /** Llamada genérica a la Drive API v3 (JSON). Lanza Error claro en != 2xx. */
  private async api(
    method: string,
    path: string,
    opts: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<unknown> {
    const token = await this.token();
    const qs = new URLSearchParams({ supportsAllDrives: "true", ...(opts.query ?? {}) });
    const res = await fetch(`${DRIVE_API}${path}?${qs}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Drive API ${method} ${path} → HTTP ${res.status}: ${detail}`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  }

  private useSharedDrive(): boolean {
    return !!this.cfg.sharedDriveId;
  }

  private rootParent(): string {
    return this.cfg.rootFolderId || this.cfg.sharedDriveId || "root";
  }

  /** Raíz del Drive (Mi unidad o el Shared Drive): tope del selector de carpetas. */
  private driveBase(): string {
    return this.cfg.sharedDriveId || "root";
  }

  /** `GENWORK_<EMPRESA>`: empresa del panel admin o, si no hay, `GENWORK_ORG`. */
  private rootName(): string | null {
    return this.cfg.orgName ? rootNameFor(this.cfg.orgName) : storageRootName();
  }

  /** Dónde vive (o va a vivir) la carpeta `GENWORK_<EMPRESA>` con esta config. */
  rootLocation(): { parentId: string; name: string | null } {
    return { parentId: this.rootParent(), name: this.rootName() };
  }

  /** Busca una subcarpeta por nombre bajo un parent, sin crearla. */
  private async findFolder(name: string, parentId: string): Promise<string | null> {
    const safe = name.replace(/'/g, "\\'");
    const listQuery: Record<string, string> = {
      q: `name = '${safe}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      includeItemsFromAllDrives: "true",
      fields: "files(id,name)",
    };
    if (this.useSharedDrive()) {
      listQuery.corpora = "drive";
      listQuery.driveId = this.cfg.sharedDriveId!;
    }
    const found = (await this.api("GET", "/files", { query: listQuery })) as { files?: DriveFile[] };
    return found.files?.[0]?.id ?? null;
  }

  /** Busca una subcarpeta por nombre bajo un parent; la crea si no existe (idempotente). */
  private async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const found = await this.findFolder(name, parentId);
    if (found) return found;

    const created = (await this.api("POST", "/files", {
      body: { name, mimeType: FOLDER_MIME, parents: [parentId] },
      query: { fields: "id" },
    })) as DriveFile;
    return created.id;
  }

  /**
   * Carpeta raíz de genwork: `GENWORK_<EMPRESA>` bajo la carpeta elegida por
   * el admin si hay empresa definida; si no, esa carpeta tal cual
   * (instalaciones previas).
   */
  private async genworkRoot(): Promise<string> {
    const root = this.rootName();
    return root ? this.findOrCreateFolder(root, this.rootParent()) : this.rootParent();
  }

  async provisionUser(input: { userId: string; email: string; displayName: string }) {
    // Modelo centralizado: no hay cuenta espejo en Drive.
    return { storageUserId: input.userId };
  }

  async createGroupFolder(input: { groupId: string; groupName: string }) {
    const groupName = this.rootName() ? folderSegment(input.groupName) : input.groupName;
    const folderId = await this.findOrCreateFolder(groupName, await this.genworkRoot());
    return { storageGroupId: folderId, storageFolderId: folderId };
  }

  // El acceso lo intermedia la plataforma; no se comparte por usuario.
  async addMember(): Promise<void> {}
  async removeMember(): Promise<void> {}

  /**
   * Carpeta del ámbito de un trabajo (grupo o personal), activa o dentro de
   * `_archivados`. Misma organización que en Nextcloud: bajo la raíz de la
   * empresa `{root}/_archivados/{ámbito}`; sin raíz (instalaciones previas)
   * `{ámbito}/_archivados`.
   */
  private async scopeFolder(scope: WorkFolderScope, archived = false): Promise<string> {
    const root = await this.genworkRoot();
    if (this.rootName() != null) {
      const base = archived ? await this.findOrCreateFolder(ARCHIVE_FOLDER, root) : root;
      const name = "groupName" in scope ? folderSegment(scope.groupName) : scope.personalEmail.toLowerCase();
      return this.findOrCreateFolder(name, base);
    }
    const container =
      "groupName" in scope
        ? await this.findOrCreateFolder(scope.groupName, root)
        : await this.findOrCreateFolder(
            scope.personalStorageUserId,
            await this.findOrCreateFolder("Personales", root),
          );
    return archived ? this.findOrCreateFolder(ARCHIVE_FOLDER, container) : container;
  }

  async createWorkFolder(input: { scope: WorkFolderScope; workName: string }) {
    const containerId = await this.scopeFolder(input.scope);
    const folderId = await this.findOrCreateFolder(input.workName, containerId);
    return { folderPath: folderId };
  }

  async archiveWorkFolder(input: {
    folderPath: string;
    direction: "archive" | "unarchive";
    scope: WorkFolderScope;
  }): Promise<void> {
    const target = await this.scopeFolder(input.scope, input.direction === "archive");
    await this.moveFolder(input.folderPath, target);
  }

  async moveWorkFolderToScope(input: { folderPath: string; scope: WorkFolderScope }) {
    await this.moveFolder(input.folderPath, await this.scopeFolder(input.scope));
    return { folderPath: input.folderPath };
  }

  async childFolder(parentPath: string, name: string): Promise<string> {
    return this.findOrCreateFolder(name, parentPath);
  }

  /**
   * En Drive el cliente navega con IDs: se valida que `clientPath` sea la
   * carpeta del trabajo o esté debajo de ella, subiendo por `parents`.
   */
  async resolveItem(rootFolderPath: string, clientPath: string | null | undefined): Promise<string> {
    const id = clientPath?.trim();
    if (!id) return rootFolderPath;
    if (!/^[\w-]+$/.test(id)) {
      throw Object.assign(new Error("Ruta de archivo inválida"), { code: "INVALID_PATH" });
    }
    let current = id;
    for (let depth = 0; depth < MAX_FOLDER_DEPTH; depth++) {
      if (current === rootFolderPath) return id;
      let info: DriveFile;
      try {
        info = (await this.api("GET", `/files/${encodeURIComponent(current)}`, {
          query: { fields: "id,parents" },
        })) as DriveFile;
      } catch (err) {
        if (err instanceof Error && err.message.includes("HTTP 404")) {
          throw Object.assign(new Error(`No existe "${id}"`), { code: "NOT_FOUND" });
        }
        throw err;
      }
      const parent = info.parents?.[0];
      if (!parent) break;
      current = parent;
    }
    throw Object.assign(new Error("La ruta no puede salir de la carpeta del trabajo"), {
      code: "INVALID_PATH",
    });
  }

  async upload(input: { folderPath: string; fileName: string; data: Buffer | Readable }) {
    const token = await this.token();
    const buffer = Buffer.isBuffer(input.data)
      ? input.data
      : await streamToBuffer(input.data as Readable);

    // Multipart related: metadata JSON + contenido. Drive permite nombres duplicados
    // (versiona: cada subida crea un archivo nuevo, no reemplaza).
    const boundary = `gw${Date.now().toString(36)}`;
    const metadata = JSON.stringify({ name: input.fileName, parents: [input.folderPath] });
    const pre = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      "utf8",
    );
    const post = Buffer.from(`\r\n--${boundary}--`, "utf8");
    const body = Buffer.concat([pre, buffer, post]);

    const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Drive upload falló (HTTP ${res.status}): ${detail}`);
    }
    const created = (await res.json()) as DriveFile;
    return { filePath: created.id };
  }

  /**
   * Subida resumable de Drive: el servidor abre la sesión con la cuenta
   * principal y el navegador sube el contenido con `PUT` a la URL de sesión,
   * directo a Google (sin ocupar el ancho de banda de genwork). La URL ya
   * autoriza esa única subida: el token nunca llega al navegador. Con `origin`
   * Google responde con CORS habilitado para ese origen.
   */
  async createUploadSession(input: {
    folderPath: string;
    fileName: string;
    size: number;
    mimeType?: string;
    origin?: string;
  }): Promise<{ uploadUrl: string }> {
    const token = await this.token();
    const res = await fetch(`${DRIVE_UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=id`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(input.size),
        ...(input.mimeType ? { "X-Upload-Content-Type": input.mimeType } : {}),
        ...(input.origin ? { Origin: input.origin } : {}),
      },
      body: JSON.stringify({ name: input.fileName, parents: [input.folderPath] }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Drive upload session falló (HTTP ${res.status}): ${detail}`);
    }
    const uploadUrl = res.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive no devolvió la URL de la sesión de subida");
    return { uploadUrl };
  }

  async read(filePath: string): Promise<Readable> {
    const token = await this.token();
    const res = await fetch(
      `${DRIVE_API}/files/${filePath}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Drive read falló (HTTP ${res.status}): ${detail}`);
    }
    return Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  }

  private mapFile(f: DriveFile): StorageFileInfo {
    const isDirectory = f.mimeType === FOLDER_MIME;
    return {
      name: f.name,
      path: f.id, // en Drive el "path" navegable es el folderId/fileId
      size: f.size ? Number(f.size) : 0,
      isDirectory,
      lastModified: f.modifiedTime ?? "",
      mimeType: f.mimeType,
    };
  }

  async listShallow(folderPath: string, subpath?: string): Promise<StorageFileInfo[]> {
    const parentId = subpath ? subpath : folderPath;
    const listQuery: Record<string, string> = {
      q: `'${parentId}' in parents and trashed = false`,
      includeItemsFromAllDrives: "true",
      fields: "files(id,name,mimeType,size,modifiedTime)",
      orderBy: "folder,name",
      pageSize: "1000",
    };
    if (this.useSharedDrive()) {
      listQuery.corpora = "drive";
      listQuery.driveId = this.cfg.sharedDriveId!;
    }
    const data = (await this.api("GET", "/files", { query: listQuery })) as { files?: DriveFile[] };
    return (data.files ?? []).map((f) => this.mapFile(f));
  }

  async list(folderPath: string): Promise<StorageFileInfo[]> {
    const out: StorageFileInfo[] = [];
    const walk = async (id: string) => {
      const items = await this.listShallow(id);
      for (const it of items) {
        out.push(it);
        if (it.isDirectory) await walk(it.path);
      }
    };
    await walk(folderPath);
    return out;
  }

  async createFolder(input: { folderPath: string; name: string }): Promise<{ path: string }> {
    const parentId = input.folderPath || this.rootParent();
    const safe = input.name.replace(/'/g, "\\'");
    const listQuery: Record<string, string> = {
      q: `name = '${safe}' and '${parentId}' in parents and trashed = false`,
      includeItemsFromAllDrives: "true",
      fields: "files(id,name)",
      pageSize: "1",
    };
    if (this.useSharedDrive()) {
      listQuery.corpora = "drive";
      listQuery.driveId = this.cfg.sharedDriveId!;
    }
    // Drive permite nombres duplicados por defecto; el chequeo de colisión es
    // responsabilidad nuestra (contracts/files-crud-and-identity.md → 409 ALREADY_EXISTS).
    const existing = (await this.api("GET", "/files", { query: listQuery })) as { files?: DriveFile[] };
    if (existing.files && existing.files.length > 0) {
      throw Object.assign(
        new Error(`Ya existe un elemento llamado "${input.name}" en esa carpeta`),
        { code: "ALREADY_EXISTS" },
      );
    }

    const created = (await this.api("POST", "/files", {
      body: { name: input.name, mimeType: FOLDER_MIME, parents: [parentId] },
      query: { fields: "id" },
    })) as DriveFile;
    return { path: created.id };
  }

  async rename(input: { path: string; newName: string }): Promise<{ path: string }> {
    await this.api("PATCH", `/files/${encodeURIComponent(input.path)}`, {
      body: { name: input.newName },
      query: { fields: "id" },
    });
    return { path: input.path };
  }

  /**
   * FR-003: elimina un archivo o carpeta. Drive borra recursivamente el
   * contenido de una carpeta al borrar su fileId, sin recorrer el árbol.
   */
  async delete(path: string): Promise<void> {
    try {
      await this.api("DELETE", `/files/${encodeURIComponent(path)}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("HTTP 404")) {
        throw Object.assign(new Error(`No existe "${path}"`), { code: "NOT_FOUND" });
      }
      throw err;
    }
  }

  /**
   * FR-004/FR-010: comparte un archivo o carpeta creando un permiso vía Drive
   * Permissions API v3. `path` es el fileId de Drive (mismo criterio que
   * createFolder/delete).
   *
   * - LINK: permiso público de lectura (`type: "anyone"`). Drive NO soporta
   *   password nativo en el link; si viene `password` se ignora. Si viene
   *   `expiresAt`, se envía como `expirationTime` (RFC3339). El `linkUrl` se
   *   obtiene del `webViewLink` del archivo.
   * - INTERNAL: permiso de lectura para un usuario concreto (`targetIdentity`
   *   como email de Google del destinatario).
   *
   * `providerShareId` codifica AMBOS valores necesarios para revocar en Drive
   * (`"${fileId}:${permissionId}"`), porque `unshare` recibe solo ese id según
   * la firma de la interfaz y la Permissions API necesita fileId + permissionId.
   */
  async share(input: {
    path: string;
    mode: "LINK" | "INTERNAL";
    password?: string;
    expiresAt?: Date;
    targetIdentity?: string;
  }): Promise<{ providerShareId: string; linkUrl?: string }> {
    const fileId = input.path;

    if (input.mode === "LINK") {
      const body: Record<string, unknown> = { type: "anyone", role: "reader" };
      // Drive no soporta password nativo en el link → se ignora (ver JSDoc).
      if (input.expiresAt) body.expirationTime = input.expiresAt.toISOString();

      const perm = (await this.api(
        "POST",
        `/files/${encodeURIComponent(fileId)}/permissions`,
        { body },
      )) as { id: string };

      const file = (await this.api("GET", `/files/${encodeURIComponent(fileId)}`, {
        query: { fields: "webViewLink" },
      })) as { webViewLink?: string };

      return {
        providerShareId: `${fileId}:${perm.id}`,
        linkUrl: file.webViewLink,
      };
    }

    // INTERNAL: destinatario concreto por email de Google.
    const body: Record<string, unknown> = {
      type: "user",
      role: "reader",
      emailAddress: input.targetIdentity,
    };
    if (input.expiresAt) body.expirationTime = input.expiresAt.toISOString();

    const perm = (await this.api(
      "POST",
      `/files/${encodeURIComponent(fileId)}/permissions`,
      { body },
    )) as { id: string };

    return { providerShareId: `${fileId}:${perm.id}` };
  }

  /**
   * FR-004/FR-010: revoca un acceso compartido. `providerShareId` codifica
   * `"${fileId}:${permissionId}"` (ver `share`). Idempotente: un 404 (permiso
   * ya inexistente) se trata como éxito.
   */
  async unshare(providerShareId: string): Promise<void> {
    const sep = providerShareId.indexOf(":");
    const fileId = sep >= 0 ? providerShareId.slice(0, sep) : providerShareId;
    const permissionId = sep >= 0 ? providerShareId.slice(sep + 1) : "";
    try {
      await this.api(
        "DELETE",
        `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
      );
    } catch (err) {
      // 404 = el permiso ya no existe → idempotente.
      if (!String((err as Error).message).includes("HTTP 404")) throw err;
    }
  }

  async moveFolder(from: string, to: string): Promise<void> {
    // `from` y `to` son folderIds: mueve el folder `from` para que su parent sea `to`.
    const info = (await this.api("GET", `/files/${from}`, {
      query: { fields: "parents", supportsAllDrives: "true" },
    })) as DriveFile;
    // Ya está en destino (reintento de la cola): no-op.
    if (info.parents?.length === 1 && info.parents[0] === to) return;
    const oldParents = (info.parents ?? []).join(",");
    await this.api("PATCH", `/files/${from}`, {
      query: {
        addParents: to,
        removeParents: oldParents,
        supportsAllDrives: "true",
        fields: "id,parents",
      },
    });
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      await this.api("DELETE", `/files/${folderPath}`, { query: { supportsAllDrives: "true" } });
    } catch (err) {
      // 404 = ya no existe → idempotente
      if (!String((err as Error).message).includes("HTTP 404")) throw err;
    }
  }

  async listGroupMembers(input: { storageGroupId: string }): Promise<{ storageUserId: string }[]> {
    // Google Drive no tiene concepto de "grupo" con membresía consultable: el acceso lo intermedia la plataforma.
    void input;
    throw new Error("Google Drive no soporta auditoría de miembros de grupo");
  }

  /** Nombre visible de la raíz del Drive para las migas del selector. */
  private async baseName(): Promise<string> {
    if (!this.useSharedDrive()) return "Mi unidad";
    const drive = (await this.api("GET", `/drives/${this.cfg.sharedDriveId}`, {
      query: { fields: "name" },
    })) as { name?: string };
    return drive.name ?? "Shared Drive";
  }

  /**
   * Camino desde la raíz del Drive hasta `folderId` (inclusive), para las migas
   * del selector. Falla con `NOT_FOUND` si no existe y `NOT_FOLDER` si no es carpeta.
   */
  async folderPath(folderId: string): Promise<{ id: string; name: string }[]> {
    const base = this.driveBase();
    const out: { id: string; name: string }[] = [];
    let current = folderId;
    for (let depth = 0; depth < MAX_FOLDER_DEPTH; depth++) {
      if (current === base) break;
      let info: DriveFile;
      try {
        info = (await this.api("GET", `/files/${encodeURIComponent(current)}`, {
          query: { fields: "id,name,mimeType,parents" },
        })) as DriveFile;
      } catch (err) {
        if (err instanceof Error && err.message.includes("HTTP 404")) {
          throw Object.assign(new Error("La carpeta no existe o no hay acceso"), { code: "NOT_FOUND" });
        }
        throw err;
      }
      if (info.mimeType !== FOLDER_MIME) {
        throw Object.assign(new Error(`"${info.name}" no es una carpeta`), { code: "NOT_FOLDER" });
      }
      // Sin parent = raíz real de Mi unidad (su ID no es el alias "root").
      const parent = info.parents?.[0];
      if (!parent) break;
      out.unshift({ id: info.id, name: info.name });
      current = parent;
    }
    out.unshift({ id: base, name: await this.baseName() });
    return out;
  }

  /**
   * Selector de carpetas del panel admin: subcarpetas de `parentId` (por
   * defecto la raíz del Drive) y el camino hasta ella.
   */
  async browseFolders(parentId?: string): Promise<{
    path: { id: string; name: string }[];
    folders: { id: string; name: string }[];
  }> {
    const currentId = parentId || this.driveBase();
    const path = await this.folderPath(currentId);
    const listQuery: Record<string, string> = {
      q: `'${currentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      includeItemsFromAllDrives: "true",
      fields: "files(id,name)",
      orderBy: "name",
      pageSize: "1000",
    };
    if (this.useSharedDrive()) {
      listQuery.corpora = "drive";
      listQuery.driveId = this.cfg.sharedDriveId!;
    }
    const data = (await this.api("GET", "/files", { query: listQuery })) as { files?: DriveFile[] };
    return { path, folders: (data.files ?? []).map((f) => ({ id: f.id, name: f.name })) };
  }

  /**
   * Cuando el admin cambia la carpeta o la empresa: mueve y/o renombra la
   * carpeta `GENWORK_<EMPRESA>` existente a donde indica `target` (la config
   * nueva). En Drive los IDs no cambian, así que proyectos, grupos y archivos
   * compartidos siguen funcionando. Sin carpeta previa no hay nada que mover.
   */
  async relocateGenworkRoot(target: GoogleDriveProvider): Promise<"moved" | "unchanged" | "none"> {
    const from = this.rootLocation();
    const to = target.rootLocation();
    if (!from.name || !to.name) return "none";
    const rootId = await this.findFolder(from.name, from.parentId);
    if (!rootId) return "none";

    const sameParent = from.parentId === to.parentId;
    if (sameParent && from.name === to.name) return "unchanged";

    if (!sameParent) {
      const chain = await target.folderPath(to.parentId);
      if (chain.some((f) => f.id === rootId)) {
        throw Object.assign(new Error(`No se puede mover ${from.name} adentro de sí misma`), {
          code: "INVALID_TARGET",
        });
      }
    }
    if (await target.findFolder(to.name, to.parentId)) {
      throw Object.assign(new Error(`Ya existe una carpeta ${to.name} en el destino`), {
        code: "ALREADY_EXISTS",
      });
    }

    const query: Record<string, string> = { fields: "id" };
    if (!sameParent) {
      const info = (await this.api("GET", `/files/${rootId}`, { query: { fields: "parents" } })) as DriveFile;
      query.addParents = to.parentId;
      query.removeParents = (info.parents ?? []).join(",");
    }
    await this.api("PATCH", `/files/${rootId}`, {
      query,
      ...(from.name !== to.name ? { body: { name: to.name } } : {}),
    });
    return "moved";
  }

  async test(): Promise<{ ok: boolean; detail: string }> {
    try {
      if (this.useSharedDrive()) {
        const drive = (await this.api("GET", `/drives/${this.cfg.sharedDriveId}`, {
          query: { fields: "id,name" },
        })) as { id: string; name: string };
        return { ok: true, detail: `Conectado al Shared Drive "${drive.name}"` };
      }
      const about = (await this.api("GET", "/about", {
        query: { fields: "user(displayName,emailAddress)" },
      })) as { user?: { displayName?: string; emailAddress?: string } };
      const who = about.user?.emailAddress ?? about.user?.displayName ?? "OK";
      return { ok: true, detail: `Conectado a Mi Drive (${who})` };
    } catch (err) {
      return { ok: false, detail: `Sin acceso a Google Drive: ${(err as Error).message}` };
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
