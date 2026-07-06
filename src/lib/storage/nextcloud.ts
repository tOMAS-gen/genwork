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

export class NextcloudProvider implements StorageProvider {
  private dav: WebDAVClient;

  constructor(private cfg: NextcloudConfig) {
    this.dav = createClient(`${cfg.url.replace(/\/$/, "")}/remote.php/dav/files/${cfg.adminUser}`, {
      username: cfg.adminUser,
      password: cfg.adminPassword,
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
          Buffer.from(`${this.cfg.adminUser}:${this.cfg.adminPassword}`).toString("base64"),
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

  private async share(path: string, withWho: string, shareType: number): Promise<void> {
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
    await this.share(folderPath, storageGroupId, SHARE_TYPE_GROUP);
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
      await this.share(base, input.scope.personalStorageUserId, SHARE_TYPE_USER);
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
