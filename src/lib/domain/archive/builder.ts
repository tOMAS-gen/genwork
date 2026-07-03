/**
 * Builder del paquete de archivado (FR-030/031): ZIP con
 *   /{Trabajo}/archivos/*  +  documentacion.html  +  documentacion.json  +  tareas.md
 * Falla completa = no hay paquete (atómico hacia el usuario).
 */

import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { docToHtml, tasksToMarkdown, type ArchivableTask } from "./render";

/** Subconjunto de StorageProvider que necesita el export (mockeable en tests). */
export interface ArchiveStorage {
  list(folderPath: string): Promise<{ name: string; path: string; isDirectory: boolean }[]>;
  read(filePath: string): Promise<Readable>;
}

export interface ArchiveInput {
  workName: string;
  folderPath: string | null;
  docContent: unknown;
  tasks: ArchivableTask[];
}

export interface ArchiveManifest {
  workName: string;
  files: string[];
  taskCount: number;
  generatedAt: string;
}

export async function buildArchivePackage(
  storage: ArchiveStorage,
  input: ArchiveInput,
  outputZipPath: string,
): Promise<ArchiveManifest> {
  await mkdir(path.dirname(outputZipPath), { recursive: true });

  const zip = archiver("zip", { zlib: { level: 6 } });
  const out = createWriteStream(outputZipPath);
  const done = new Promise<void>((resolve, reject) => {
    out.on("close", () => resolve());
    zip.on("error", reject);
    out.on("error", reject);
  });
  zip.pipe(out);

  const root = input.workName.replace(/[\\/:*?"<>|]/g, "-");
  const manifest: ArchiveManifest = {
    workName: input.workName,
    files: [],
    taskCount: input.tasks.length,
    generatedAt: new Date().toISOString(),
  };

  // Archivos de la mini nube
  if (input.folderPath) {
    const entries = await storage.list(input.folderPath);
    for (const entry of entries.filter((e) => !e.isDirectory)) {
      const rel = entry.path.startsWith(input.folderPath)
        ? entry.path.slice(input.folderPath.length).replace(/^\//, "")
        : entry.name;
      const stream = await storage.read(entry.path);
      zip.append(stream, { name: `${root}/archivos/${rel}` });
      manifest.files.push(rel);
    }
  }

  zip.append(docToHtml(input.workName, input.docContent), {
    name: `${root}/documentacion.html`,
  });
  zip.append(JSON.stringify(input.docContent ?? null, null, 2), {
    name: `${root}/documentacion.json`,
  });
  zip.append(tasksToMarkdown(input.workName, input.tasks), { name: `${root}/tareas.md` });
  zip.append(JSON.stringify(manifest, null, 2), { name: `${root}/manifest.json` });

  await zip.finalize();
  await done;
  return manifest;
}
