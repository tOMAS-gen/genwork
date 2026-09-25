/**
 * Renderizadores del paquete de archivado (FR-030): formatos estándar legibles
 * sin el sistema — HTML para la documentación, Markdown para el registro de tareas.
 */

import { groupTasksByObjective } from "@/lib/domain/objectives/grouping";
import { objectiveTaskCounts } from "@/lib/domain/objectives/progress";

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
  /** 062-subtareas / objetivos: identidad para anidar hijas bajo su padre. */
  id?: string;
  parentId?: string | null;
  /** objetivos: sección del export; un id desconocido cae en generales. */
  objectiveId?: string | null;
  displayText: string;
  rawText: string;
  statusType: "IN_PROGRESS" | "FINAL";
  createdAt: Date;
  completedAt: Date | null;
  creatorName: string;
  completedByName: string | null;
  tags: { symbol: string; name: string }[];
}

/** objetivos (D12): lo que el export necesita de un objetivo, ya ordenado. */
export interface ArchivableObjective {
  id: string;
  title: string;
  description: string | null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Las dos líneas de una tarea (checkbox + autoría), con la sangría pedida. */
function taskLines(t: ArchivableTask, indent: string): string[] {
  const mark = t.statusType === "FINAL" ? "x" : " ";
  const tags = t.tags.map((tag) => `${tag.symbol}${tag.name}`).join(" ");
  return [
    `${indent}- [${mark}] ${t.displayText}${tags ? ` — ${tags}` : ""}`,
    `${indent}  - creada por ${t.creatorName} el ${day(t.createdAt)}` +
      (t.completedAt ? `; realizada por ${t.completedByName ?? "?"} el ${day(t.completedAt)}` : ""),
  ];
}

/**
 * Registro de tareas legible sin el sistema (FR-030).
 *
 * - 062-subtareas: una hija va debajo de su padre (2 espacios de sangría) si
 *   el padre está en la lista; si no, queda como raíz.
 * - objetivos (D12): sin objetivos la salida es la de siempre (sin
 *   encabezados). Con objetivos: `## Tareas generales` (solo si hay alguna) y
 *   después `## Objetivo: <título> (hechas/total)` por cada uno, en el orden
 *   recibido. El contador usa la regla de contenedor (`objectiveTaskCounts`,
 *   el mismo número que la página y el portal). Las hijas van en la sección
 *   de su RAÍZ.
 * - El encabezado sigue contando todas las filas (`tasks.length`).
 */
export function tasksToMarkdown(
  workName: string,
  tasks: ArchivableTask[],
  objectives: ArchivableObjective[] = [],
): string {
  const lines = [`# Tareas — ${workName}`, "", `Exportado el ${day(new Date())}. ${tasks.length} tareas.`, ""];

  const ids = new Set(tasks.map((t) => t.id).filter((id): id is string => !!id));
  const childrenOf = new Map<string, ArchivableTask[]>();
  const roots: ArchivableTask[] = [];
  for (const t of tasks) {
    if (t.parentId && ids.has(t.parentId)) {
      const siblings = childrenOf.get(t.parentId) ?? [];
      siblings.push(t);
      childrenOf.set(t.parentId, siblings);
    } else {
      roots.push(t);
    }
  }
  const children = (t: ArchivableTask) => (t.id ? (childrenOf.get(t.id) ?? []) : []);
  const pushTree = (list: ArchivableTask[]) => {
    for (const root of list) {
      lines.push(...taskLines(root, ""));
      for (const child of children(root)) lines.push(...taskLines(child, "  "));
    }
  };

  if (objectives.length === 0) {
    pushTree(roots);
    return lines.join("\n") + "\n";
  }

  const { general, sections } = groupTasksByObjective(roots, objectives);
  if (general.length > 0) {
    lines.push("## Tareas generales", "");
    pushTree(general);
    lines.push("");
  }
  for (const { objective, tasks: sectionRoots } of sections) {
    const { done, total } = objectiveTaskCounts(
      sectionRoots.map((r) => {
        const kids = children(r);
        return {
          status: { type: r.statusType },
          subtaskCount: kids.length,
          subtaskDone: kids.filter((k) => k.statusType === "FINAL").length,
        };
      }),
    );
    lines.push(`## Objetivo: ${objective.title} (${done}/${total})`, "");
    if (objective.description) lines.push(objective.description, "");
    if (sectionRoots.length === 0) lines.push("_Sin tareas._");
    else pushTree(sectionRoots);
    lines.push("");
  }
  while (lines.at(-1) === "") lines.pop();
  return lines.join("\n") + "\n";
}
