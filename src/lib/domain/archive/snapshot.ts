/**
 * Snapshot de datos del proyecto que se deja en su carpeta de la nube al
 * archivarlo: `_genwork/proyecto.json` (datos completos), `tareas.md` y
 * `documentacion.html` (legibles sin el sistema). Archivos sueltos, sin ZIP:
 * se navegan y sincronizan como cualquier otro. El ZIP queda solo para la
 * exportación del sistema (`builder.ts`).
 *
 * Sobrescribe en cada llamada, así que un reintento de la cola es seguro.
 */

import type { ArchivableWork } from "./load";
import { docToHtml, tasksToMarkdown } from "./render";

/** Subcarpeta con los datos del proyecto dentro de su carpeta en la nube. */
export const SNAPSHOT_FOLDER = "_genwork";

/** Subconjunto de StorageProvider que necesita el snapshot (mockeable en tests). */
export interface SnapshotStorage {
  upload(input: { folderPath: string; fileName: string; data: Buffer }): Promise<{
    filePath: string;
  }>;
  /** Proveedores por ID (Drive): resuelve/crea la subcarpeta `_genwork`. */
  childFolder?(parentPath: string, name: string): Promise<string>;
}

export async function writeArchiveSnapshot(
  storage: SnapshotStorage,
  work: ArchivableWork,
  folderPath: string,
): Promise<string[]> {
  const target = storage.childFolder
    ? await storage.childFolder(folderPath, SNAPSHOT_FOLDER)
    : `${folderPath}/${SNAPSHOT_FOLDER}`;
  const { docContent, tasks, objectives, ...info } = work;
  const files: [string, string][] = [
    [
      "proyecto.json",
      JSON.stringify(
        { ...info, folderPath, archivedAt: new Date().toISOString(), objectives, tasks, docContent },
        null,
        2,
      ),
    ],
    ["tareas.md", tasksToMarkdown(work.name, tasks, objectives)],
    ["documentacion.html", docToHtml(work.name, docContent)],
  ];
  for (const [fileName, content] of files) {
    await storage.upload({ folderPath: target, fileName, data: Buffer.from(content, "utf8") });
  }
  return files.map(([name]) => name);
}
