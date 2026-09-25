import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  ObjectiveSection,
  countObjectiveTasks,
  objectiveAnchorId,
} from "@/components/objectives/ObjectiveSection";
import { buildObjectiveMenuItems } from "@/components/objectives/objectiveMenu";

/** renderToString, mismo patrón que tests/unit/subtask-list.test.tsx (entorno node). */
const objective = { id: "o1", title: "Instalación", description: "Todo lo eléctrico" };
const pendingTask = { status: { type: "IN_PROGRESS" as const } };
const doneTask = { status: { type: "FINAL" as const } };

// Sin los `<!-- -->` que React intercala entre nodos de texto ("2/5 · 40%").
function render(props: Partial<Parameters<typeof ObjectiveSection>[0]> = {}) {
  return renderToString(
    <ObjectiveSection
      objective={objective}
      tasks={[doneTask, doneTask, pendingTask, pendingTask, pendingTask]}
      open
      onToggle={() => {}}
      {...props}
    >
      <p>fila-hija</p>
    </ObjectiveSection>,
  ).replaceAll("<!-- -->", "");
}

describe("ObjectiveSection", () => {
  it("muestra título, descripción, progreso X/Y y pendientes", () => {
    const html = render();
    expect(html).toContain("Instalación");
    expect(html).toContain("Todo lo eléctrico");
    expect(html).toContain("2/5 · 40%");
    expect(html).toContain('aria-label="3 tareas pendientes en Instalación"');
    expect(html).toContain('aria-label="Progreso de Instalación"');
    expect(html).toContain("fila-hija");
  });

  it("lleva el ancla del chip y aria-controls apunta al panel", () => {
    const html = render();
    expect(objectiveAnchorId("o1")).toBe("objetivo-o1");
    expect(html).toContain('id="objetivo-o1"');
    expect(html).toContain('aria-controls="objetivo-o1-tareas"');
    expect(html).toContain('id="objetivo-o1-tareas"');
    expect(html).toContain('aria-expanded="true"');
  });

  it("completo: muestra 'Completo' y la clase is-complete, sin badge de pendientes", () => {
    const html = render({ tasks: [doneTask, doneTask] });
    expect(html).toContain("Completo");
    expect(html).toContain("is-complete");
    expect(html).not.toContain("pendientes en");
  });

  it("sin tareas: 'Sin tareas' y sin barra de progreso", () => {
    const html = render({ tasks: [] });
    expect(html).toContain("Sin tareas");
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("Completo");
  });

  it("plegado: aria-expanded=false, panel hidden, sin filas ni descripción", () => {
    const html = render({ open: false });
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/id="objetivo-o1-tareas"[^>]*hidden/);
    expect(html).not.toContain("fila-hija");
    expect(html).not.toContain("Todo lo eléctrico");
  });

  it("sin menuItems (solo lectura) no hay ⋮; con ellos sí", () => {
    expect(render()).not.toContain("Acciones del objetivo");
    const items = buildObjectiveMenuItems({
      isFirst: true,
      isLast: false,
      onEdit: () => {},
      onMoveUp: () => {},
      onMoveDown: () => {},
      onSaveAsTemplate: () => {},
      onDelete: () => {},
    });
    expect(render({ menuItems: items })).toContain('aria-label="Acciones del objetivo &quot;Instalación&quot;"');
  });

  it("el botón de plegar y el ⋮ son hermanos: nunca un botón dentro de otro", () => {
    const items = buildObjectiveMenuItems({
      isFirst: false,
      isLast: false,
      onEdit: () => {},
      onMoveUp: () => {},
      onMoveDown: () => {},
      onSaveAsTemplate: () => {},
      onDelete: () => {},
    });
    const html = render({ menuItems: items });
    for (const chunk of html.split("</button>")) {
      expect(chunk.split("<button").length - 1).toBeLessThanOrEqual(1);
    }
  });

  it("una contenedora cuenta por sus hijas (regla de 062)", () => {
    const html = render({ tasks: [{ status: { type: "IN_PROGRESS" }, subtaskCount: 3, subtaskDone: 1 }] });
    expect(html).toContain("1/3");
  });
});

describe("countObjectiveTasks", () => {
  it("suma raíces y todas sus hijas (N del diálogo de borrado)", () => {
    expect(countObjectiveTasks([{ subtaskCount: 2 }, {}, { subtaskCount: 0 }])).toBe(5);
    expect(countObjectiveTasks([])).toBe(0);
  });
});
