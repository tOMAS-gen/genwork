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
import type { GoogleDriveConfig, StorageFileInfo, StorageProvider } from "./provider";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

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
    return getAccessToken({
      clientId: this.cfg.clientId,
      clientSecret: this.cfg.clientSecret,
      refreshToken: this.cfg.refreshToken,
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
    return this.cfg.rootFolderId ?? this.cfg.sharedDriveId ?? "root";
  }

  /** Busca una subcarpeta por nombre bajo un parent; la crea si no existe (idempotente). */
  private async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const safe = name.replace(/'/g, "\\'");
    const q = `name = '${safe}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
    const listQuery: Record<string, string> = {
      q,
      includeItemsFromAllDrives: "true",
      fields: "files(id,name)",
    };
    if (this.useSharedDrive()) {
      listQuery.corpora = "drive";
      listQuery.driveId = this.cfg.sharedDriveId!;
    }
    const found = (await this.api("GET", "/files", { query: listQuery })) as { files?: DriveFile[] };
    if (found.files && found.files.length > 0) return found.files[0].id;

    const created = (await this.api("POST", "/files", {
      body: { name, mimeType: FOLDER_MIME, parents: [parentId] },
      query: { fields: "id" },
    })) as DriveFile;
    return created.id;
  }

  async provisionUser(input: { userId: string; email: string; displayName: string }) {
    // Modelo centralizado: no hay cuenta espejo en Drive.
    return { storageUserId: input.userId };
  }

  async createGroupFolder(input: { groupId: string; groupName: string }) {
    const folderId = await this.findOrCreateFolder(input.groupName, this.rootParent());
    return { storageGroupId: folderId, storageFolderId: folderId };
  }

  // El acceso lo intermedia la plataforma; no se comparte por usuario.
  async addMember(): Promise<void> {}
  async removeMember(): Promise<void> {}

  async createWorkFolder(input: {
    scope: { groupName: string } | { personalStorageUserId: string };
    workName: string;
  }) {
    let containerId: string;
    if ("groupName" in input.scope) {
      containerId = await this.findOrCreateFolder(input.scope.groupName, this.rootParent());
    } else {
      const personalRoot = await this.findOrCreateFolder("Personales", this.rootParent());
      containerId = await this.findOrCreateFolder(input.scope.personalStorageUserId, personalRoot);
    }
    const folderId = await this.findOrCreateFolder(input.workName, containerId);
    return { folderPath: folderId };
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

  async moveFolder(from: string, to: string): Promise<void> {
    // `from` y `to` son folderIds: mueve el folder `from` para que su parent sea `to`.
    const info = (await this.api("GET", `/files/${from}`, {
      query: { fields: "parents", supportsAllDrives: "true" },
    })) as DriveFile;
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
