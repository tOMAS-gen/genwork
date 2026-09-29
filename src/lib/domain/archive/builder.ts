/**
 * Builder del paquete de archivado (FR-030/031): ZIP con
 *   /{Trabajo}/archivos/*  +  documentacion.html  +  documentacion.json  +  tareas.md
 * Falla completa = no hay paquete (atómico hacia el usuario).
 */

import { ZipArchive } from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { docToHtml, tasksToMarkdown, type ArchivableObjective, type ArchivableTask } from "./render";
import { SNAPSHOT_FOLDER } from "./snapshot";

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
  /** objetivos (D12): en orden; sin objetivos `tareas.md` sale como siempre. */
  objectives?: ArchivableObjective[];
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

  const zip = new ZipArchive({ zlib: { level: 6 } });
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
      // El snapshot de un archivado anterior queda viejo: el paquete ya trae
      // su propia documentación y tareas al día.
      if (rel.startsWith(`${SNAPSHOT_FOLDER}/`)) continue;
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
  zip.append(tasksToMarkdown(input.workName, input.tasks, input.objectives ?? []), { name: `${root}/tareas.md` });
  zip.append(JSON.stringify(manifest, null, 2), { name: `${root}/manifest.json` });

  await zip.finalize();
  await done;
  return manifest;
}
