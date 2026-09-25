import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { PortalTaskGroups } from "@/components/portal/PortalTaskGroups";
import type { PortalObjective, PortalTask } from "@/components/portal/types";

/**
 * objetivos (D11): pestaña Tareas del portal agrupada en generales + un bloque
 * por objetivo con su progreso. Solo lectura: ningún control.
 */

const task = (id: string, done = false): PortalTask => ({
  id,
  displayText: id,
  rawText: id,
  description: null,
  dueDate: null,
  position: 0,
  status: done
    ? { name: "Hecha", color: "#22c55e", type: "FINAL" }
    : { name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" },
  links: [],
  labels: [],
  parentId: null,
  parentText: null,
  subtasks: [],
  subtaskCount: 0,
  subtaskDone: 0,
});

const objective = (
  id: string,
  title: string,
  tasks: PortalTask[],
  done: number,
  total: number,
  description: string | null = null,
): PortalObjective => ({
  id,
  title,
  description,
  taskCounts: { done, total },
  pct: total ? Math.round((done / total) * 100) : 0,
  tasks,
});

// Sin los `<!-- -->` que React intercala entre nodos de texto ("1/2 · 50%").
const render = (work: { tasks: PortalTask[]; objectives: PortalObjective[] }) =>
  renderToString(<PortalTaskGroups work={work} />).replaceAll("<!-- -->", "");

describe("PortalTaskGroups (objetivos, D11)", () => {
  it("sin objetivos: la lista de siempre, sin el título 'Tareas generales'", () => {
    const html = render({ tasks: [task("Diseñar tapa")], objectives: [] });
    expect(html).toContain("Diseñar tapa");
    expect(html).toContain("portal-task-list");
    expect(html).not.toContain("Tareas generales");
    expect(html).not.toContain("portal-objective");
  });

  it("nada cargado: el EmptyState de siempre", () => {
    const html = render({ tasks: [], objectives: [] });
    expect(html).toContain("El proyecto todavía no tiene tareas");
  });

  it("con objetivos: generales primero y después cada objetivo en orden, con su descripción", () => {
    const html = render({
      tasks: [task("Relevar")],
      objectives: [
        objective("a", "Diseño", [task("Plano", true), task("Render")], 1, 2, "Planos y renders"),
        objective("b", "Obra", [task("Hormigonar")], 0, 1),
      ],
    });
    const iGen = html.indexOf("Tareas generales");
    const iRelevar = html.indexOf("Relevar");
    const iDis = html.indexOf("Diseño");
    const iObra = html.indexOf("Obra");
    expect(iGen).toBeGreaterThan(-1);
    expect(iRelevar).toBeGreaterThan(iGen);
    expect(iDis).toBeGreaterThan(iRelevar);
    expect(iObra).toBeGreaterThan(iDis);
    expect(html).toContain("Planos y renders");
    expect(html).toContain("1/2 · 50%");
  });

  it("sin tareas generales no muestra la sección de generales", () => {
    const html = render({ tasks: [], objectives: [objective("a", "Diseño", [task("Plano")], 0, 1)] });
    expect(html).not.toContain("Tareas generales");
    expect(html).toContain("Plano");
  });

  it("'Completo' solo cuando todas las tareas del objetivo están hechas", () => {
    const html = render({
      tasks: [],
      objectives: [
        objective("a", "Diseño", [task("Plano", true)], 1, 1),
        objective("b", "Obra", [task("Hormigonar")], 0, 1),
      ],
    });
    expect(html.match(/Completo/g)).toHaveLength(1);
    expect(html.indexOf("Completo")).toBeLessThan(html.indexOf("Obra"));
  });

  it("un objetivo vacío muestra su mensaje y no se marca como completo", () => {
    const html = render({ tasks: [task("Relevar")], objectives: [objective("a", "Entrega", [], 0, 0)] });
    expect(html).toContain("Todavía no hay tareas en este objetivo.");
    expect(html).not.toContain("Completo");
  });

  it("cada objetivo es una sección con nombre accesible (su h2)", () => {
    const html = render({ tasks: [], objectives: [objective("a", "Diseño", [task("Plano")], 0, 1)] });
    expect(html).toContain('aria-labelledby="portal-objetivo-a"');
    expect(html).toMatch(/<h2[^>]*id="portal-objetivo-a"[^>]*>Diseño<\/h2>/);
  });

  it("solo lectura: sin inputs ni botones", () => {
    const html = render({
      tasks: [task("Relevar")],
      objectives: [objective("a", "Diseño", [task("Plano", true)], 1, 1)],
    });
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<button");
  });
});
