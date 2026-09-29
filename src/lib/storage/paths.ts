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

/**
 * Partes de una ruta bajo la raíz de la empresa:
 * `/{root}/[_archivados/]{ámbito}/[{carpeta}/]{proyecto}`. `null` si la ruta no
 * sigue ese formato (instalaciones sin raíz por empresa o ids de Drive).
 */
function splitRootedPath(path: string, root: string | null | undefined) {
  if (!root || !path.startsWith(`/${root}/`)) return null;
  const rest = path.slice(root.length + 2).split("/");
  const archived = rest[0] === ARCHIVE_FOLDER;
  if (archived) rest.shift();
  if (rest.length < 2 || rest.length > 3) return null;
  return {
    archived,
    scope: rest[0],
    folder: rest.length === 3 ? rest[1] : null,
    project: rest[rest.length - 1],
  };
}

/**
 * Feature 063: ruta de un proyecto al cambiar su carpeta de proyectos. Inserta,
 * reemplaza o quita el nivel `{carpeta}` entre el ámbito y el proyecto, y
 * conserva el archivado. Las rutas fuera del formato con raíz por empresa se
 * devuelven sin cambios (la carpeta de proyectos solo existe en ese formato).
 */
export function computeProjectFolderPath(
  currentPath: string,
  folderName: string | null,
  root?: string | null,
): string {
  const parts = splitRootedPath(currentPath, root);
  if (!parts) return currentPath;
  return [
    "",
    root,
    ...(parts.archived ? [ARCHIVE_FOLDER] : []),
    parts.scope,
    ...(folderName ? [folderSegment(folderName)] : []),
    parts.project,
  ].join("/");
}

/**
 * Carpeta de proyectos que contiene la ruta de un proyecto (`/{root}/…/{carpeta}`),
 * o `null` si el proyecto cuelga directo de su ámbito.
 */
export function projectFolderContainerPath(path: string, root?: string | null): string | null {
  const parts = splitRootedPath(path, root);
  if (!parts?.folder) return null;
  return path.substring(0, path.lastIndexOf("/"));
}

/**
 * Carpeta del ámbito dentro de `_archivados` que se comparte al archivar
 * (`/{root}/_archivados/{ámbito}`), aunque el proyecto esté dentro de una
 * carpeta de proyectos. Fuera del formato con raíz: la carpeta padre.
 */
export function archiveScopePath(archivedPath: string, root?: string | null): string {
  const parts = splitRootedPath(archivedPath, root);
  if (parts?.archived) return `/${root}/${ARCHIVE_FOLDER}/${parts.scope}`;
  return archivedPath.substring(0, archivedPath.lastIndexOf("/"));
}

export { sanitizeSegment };
