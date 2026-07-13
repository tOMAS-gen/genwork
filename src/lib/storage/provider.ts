/**
 * Interfaz del módulo de almacenamiento conectable (FR-037).
 * v1: NextcloudProvider. Futuro: GoogleDriveProvider — se agrega sin tocar el dominio.
 */

import type { Readable } from "node:stream";

export interface StorageFileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: string;
  mimeType: string;
}

export interface StorageProvider {
  /** FR-033: crea la cuenta espejo del usuario en la nube. Idempotente. */
  provisionUser(input: { userId: string; email: string; displayName: string }): Promise<{
    storageUserId: string;
  }>;

  /** FR-034: crea el grupo + carpeta compartida (Group Folder). Idempotente. */
  createGroupFolder(input: { groupId: string; groupName: string }): Promise<{
    storageGroupId: string;
    storageFolderId: string;
  }>;

  /** FR-034: alta de miembro en la carpeta compartida del grupo. Idempotente. */
  addMember(input: { storageGroupId: string; storageUserId: string }): Promise<void>;

  /** FR-034: baja de miembro (deja de compartirse). Idempotente. */
  removeMember(input: { storageGroupId: string; storageUserId: string }): Promise<void>;

  /**
   * FR-029: carpeta del trabajo dentro de su ámbito (Group Folder del grupo o
   * carpeta personal del creador). Devuelve el path raíz de la carpeta.
   */
  createWorkFolder(input: {
    scope: { groupName: string } | { personalStorageUserId: string };
    workName: string;
  }): Promise<{ folderPath: string }>;

  /** Sube un archivo a un path dentro de la carpeta de un trabajo. */
  upload(input: { folderPath: string; fileName: string; data: Buffer | Readable }): Promise<{
    filePath: string;
  }>;

  /** Lee un archivo como stream (para servirlo o exportarlo). */
  read(filePath: string): Promise<Readable>;

  /** Lista recursivamente los archivos de una carpeta (para el export). */
  list(folderPath: string): Promise<StorageFileInfo[]>;

  /** Lista un solo nivel de directorio (no recursivo, para el visor de archivos). */
  listShallow(folderPath: string, subpath?: string): Promise<StorageFileInfo[]>;

  /** FR-001: crea una carpeta hija dentro del path indicado. */
  createFolder(input: { folderPath: string; name: string }): Promise<{ path: string }>;

  /** FR-003: elimina un archivo o carpeta; si es carpeta, recursivo. */
  delete(path: string): Promise<void>;

  /** FR-004/FR-010: comparte un archivo o carpeta por link o con identidad interna. */
  share(input: {
    path: string;
    mode: "LINK" | "INTERNAL";
    password?: string;
    expiresAt?: Date;
    targetIdentity?: string;
  }): Promise<{ providerShareId: string; linkUrl?: string }>;

  /** FR-004/FR-010: revoca un acceso compartido existente. */
  unshare(providerShareId: string): Promise<void>;

  /** Mueve una carpeta (archivado/desarchivado). */
  moveFolder(from: string, to: string): Promise<void>;

  /** FR-032: borra la carpeta completa de un trabajo (eliminación definitiva). */
  deleteFolder(folderPath: string): Promise<void>;

  /** FR-008: lista los storageUserId actualmente miembros de un grupo Nextcloud, para auditoría. */
  listGroupMembers(input: { storageGroupId: string }): Promise<{ storageUserId: string }[]>;

  /** Prueba de conectividad para el módulo de conexión del panel admin. */
  test(): Promise<{ ok: boolean; detail: string }>;
}

export interface NextcloudConfig {
  url: string;
  adminUser: string;
  adminPassword: string;
  /** Credencial propia de usuario, ya descifrada, para operaciones interactivas (FR-011). */
  userCredential?: NextcloudUserCredential;
}

export interface NextcloudUserCredential {
  nextcloudLoginName: string;
  nextcloudAppPassword: string;
}

/** Config resuelta del proveedor Google Drive (feature 034). */
export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  /** Refresh token del administrador (ya descifrado). */
  refreshToken: string;
  /** Shared Drive dedicado (Workspace). Vacío/ausente = usar Mi Drive. */
  sharedDriveId?: string;
  /** Carpeta raíz dentro del Drive (Shared o Mi Drive). */
  rootFolderId?: string;
  /** Credencial propia de usuario, ya descifrada, para operaciones interactivas (FR-011). */
  userCredential?: GoogleDriveUserCredential;
}

export interface GoogleDriveUserCredential {
  gdriveRefreshToken: string;
}

export type StorageUserCredential =
  | ({ provider: "NEXTCLOUD" } & NextcloudUserCredential)
  | ({ provider: "GDRIVE" } & GoogleDriveUserCredential);
