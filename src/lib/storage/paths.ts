/** Caracteres que ningún sistema de archivos de la nube acepta en un nombre. */
const INVALID_CHARS = /[\\/:*?"<>|]/g;

function sanitizeSegment(name: string): string {
  return name.replace(INVALID_CHARS, "-").trim();
}

/**
 * Segmento de carpeta generado por genwork (raíz, grupo, proyecto): MAYÚSCULAS,
 * guion en lugar de espacios, sin caracteres inválidos ni guiones repetidos o en
 * los extremos. Conserva acentos y `ñ`. Determinista: mismo texto → mismo nombre.
 */
export function folderSegment(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(INVALID_CHARS, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Nombre de la carpeta de un proyecto: `NOMBRE-DEL-PROYECTO_007`. El código es
 * `folderSeq` (único en la instalación), así que dos proyectos homónimos nunca
 * chocan. El código se lee desde el último `_` (ver `parseFolderCode`), por lo
 * que el nombre puede contener `_` libremente.
 */
export function formatFolderName(seq: number, name: string): string {
  return `${folderSegment(name)}_${String(seq).padStart(3, "0")}`;
}

/**
 * Código de referencia (folderSeq) de un nombre de carpeta de proyecto, o
 * `null` si no sigue el formato. Tolera el sufijo anti-duplicado `-2`, `-3`…
 */
export function parseFolderCode(folderName: string): number | null {
  const match = /_(\d+)(?:-\d+)?$/.exec(folderName);
  return match ? Number(match[1]) : null;
}

/** Nombre de la carpeta de un proyecto archivado, hermana de los ámbitos dentro de la raíz. */
export const ARCHIVE_FOLDER = "_archivados";

/**
 * Ruta de archivado/desarchivado. Bajo la raíz de la empresa (`root`) el
 * archivado replica la organización: `/{root}/{ámbito}/{proyecto}` ↔
 * `/{root}/_archivados/{ámbito}/{proyecto}`. Las rutas previas a la raíz por
 * empresa conservan el formato viejo (`_archivados` dentro del ámbito).
 */
export function computeArchivePath(
  currentPath: string,
  direction: "archive" | "unarchive",
  root?: string | null,
): string {
  if (root && currentPath.startsWith(`/${root}/`)) {
    const rest = currentPath.slice(root.length + 2).split("/");
    const isArchived = rest[0] === ARCHIVE_FOLDER;
    if (direction === "archive") {
      return isArchived ? currentPath : ["", root, ARCHIVE_FOLDER, ...rest].join("/");
    }
    return isArchived ? ["", root, ...rest.slice(1)].join("/") : currentPath;
  }

  const parts = currentPath.split("/");
  const folderName = parts.pop()!;
  if (direction === "archive") {
    return [...parts, ARCHIVE_FOLDER, folderName].join("/");
  }
  // unarchive: remove _archivados segment
  const filtered = parts.filter((p) => p !== ARCHIVE_FOLDER);
  return [...filtered, folderName].join("/");
}

export function computeRenamePath(currentPath: string, folderSeq: number, newName: string): string {
  const parts = currentPath.split("/");
  parts[parts.length - 1] = formatFolderName(folderSeq, newName);
  return parts.join("/");
}

export { sanitizeSegment };
