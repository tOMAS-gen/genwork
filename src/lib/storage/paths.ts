function sanitizeSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

export function formatFolderName(seq: number, name: string): string {
  return `${String(seq).padStart(3, "0")}-${sanitizeSegment(name)}`;
}

export function computeArchivePath(currentPath: string, direction: "archive" | "unarchive"): string {
  const parts = currentPath.split("/");
  const folderName = parts.pop()!;
  if (direction === "archive") {
    return [...parts, "_archivados", folderName].join("/");
  }
  // unarchive: remove _archivados segment
  const filtered = parts.filter((p) => p !== "_archivados");
  return [...filtered, folderName].join("/");
}

export function computeRenamePath(currentPath: string, folderSeq: number, newName: string): string {
  const parts = currentPath.split("/");
  parts[parts.length - 1] = formatFolderName(folderSeq, newName);
  return parts.join("/");
}
