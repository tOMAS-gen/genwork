/**
 * Renderizadores del paquete de archivado (FR-030): formatos estándar legibles
 * sin el sistema — HTML para la documentación, Markdown para el registro de tareas.
 */

interface PMNode {
  type?: string;
  text?: string;
  content?: PMNode[];
  attrs?: Record<string, unknown>;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderNode(node: PMNode): string {
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "text":
      return esc(node.text ?? "");
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading":
      return `<h${node.attrs?.level ?? 2}>${children}</h${node.attrs?.level ?? 2}>`;
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "image":
      return `<p><em>[imagen: ${esc(String(node.attrs?.src ?? ""))}]</em></p>`;
    case "hardBreak":
      return "<br/>";
    default:
      return children;
  }
}

export function docToHtml(workName: string, docContent: unknown): string {
  const body = docContent ? renderNode(docContent as PMNode) : "<p><em>Sin documentación</em></p>";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(workName)}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6}</style>
</head><body><h1>${esc(workName)}</h1>${body}</body></html>`;
}

export interface ArchivableTask {
  displayText: string;
  rawText: string;
  statusType: "IN_PROGRESS" | "FINAL";
  createdAt: Date;
  completedAt: Date | null;
  creatorName: string;
  completedByName: string | null;
  tags: { symbol: string; name: string }[];
}

export function tasksToMarkdown(workName: string, tasks: ArchivableTask[]): string {
  const lines = [
    `# Tareas — ${workName}`,
    "",
    `Exportado el ${new Date().toISOString().slice(0, 10)}. ${tasks.length} tareas.`,
    "",
  ];
  for (const t of tasks) {
    const mark = t.statusType === "FINAL" ? "x" : " ";
    const tags = t.tags.map((tag) => `${tag.symbol}${tag.name}`).join(" ");
    lines.push(`- [${mark}] ${t.displayText}${tags ? ` — ${tags}` : ""}`);
    lines.push(
      `  - creada por ${t.creatorName} el ${t.createdAt.toISOString().slice(0, 10)}` +
        (t.completedAt
          ? `; realizada por ${t.completedByName ?? "?"} el ${t.completedAt
              .toISOString()
              .slice(0, 10)}`
          : ""),
    );
  }
  return lines.join("\n") + "\n";
}
