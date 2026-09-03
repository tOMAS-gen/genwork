import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { PortalTaskItem } from "@/components/portal/PortalTaskItem";
import type { PortalTask } from "@/components/portal/types";

/**
 * 062-subtareas (hallazgo Importante 5 de revisión): el portal contaba las
 * hijas en `taskCounts` pero no las renderizaba — el cliente veía "0/3" con
 * una sola tarea en pantalla. Este test verifica que `PortalTaskItem`
 * efectivamente pinta las hijas anidadas, indentadas bajo su padre, solo
 * lectura (sin casilla ni controles de arrastre).
 */

const task = (over: Partial<PortalTask> & { id: string }): PortalTask => ({
  displayText: over.displayText ?? over.id,
  // renderSegments() arma el texto visible a partir de `rawText`, no de
  // `displayText` — sin texto propio sin tags, ambos coinciden.
  rawText: over.displayText ?? over.id,
  description: null,
  dueDate: null,
  position: 0,
  status: { name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
  links: [],
  labels: [],
  parentId: null,
  parentText: null,
  subtasks: [],
  subtaskCount: 0,
  subtaskDone: 0,
  ...over,
});

describe("PortalTaskItem — subtareas anidadas (062-subtareas)", () => {
  it("renderiza las hijas indentadas bajo su padre", () => {
    const padre = task({
      id: "padre",
      displayText: "Diseñar tapa",
      subtaskCount: 1,
      subtasks: [task({ id: "hija", displayText: "Revisar con Ana" })],
    });

    const html = renderToString(<PortalTaskItem task={padre} />);

    expect(html).toContain("Diseñar tapa");
    expect(html).toContain("Revisar con Ana");
    expect(html).toContain("portal-subtask-list");
  });

  it("una tarea sin hijas no renderiza la lista anidada", () => {
    const suelta = task({ id: "suelta", displayText: "Tarea suelta" });

    const html = renderToString(<PortalTaskItem task={suelta} />);

    expect(html).not.toContain("portal-subtask-list");
  });

  it("una hija finalizada se ve como 'done' dentro de la lista anidada", () => {
    const padre = task({
      id: "padre",
      subtaskCount: 1,
      subtaskDone: 1,
      subtasks: [
        task({ id: "hija-final", displayText: "Ya la hice", status: { name: "Hecha", color: "#22c55e", type: "FINAL" } }),
      ],
    });

    const html = renderToString(<PortalTaskItem task={padre} />);

    expect(html).toContain("Ya la hice");
    expect(html).toMatch(/class="task portal-task done"[^>]*>[\s\S]*Ya la hice/);
  });
});
