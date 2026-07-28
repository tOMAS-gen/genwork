import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";

describe("TaskGroupHeader", () => {
  it("renderiza el proyecto y el grupo como enlace", () => {
    const html = renderToString(
      <TaskGroupHeader work={{ id: "work-1", name: "ProyectoAlfa", status: "IN_PROGRESS", group: { id: "group-1", name: "GrupoX" } }} />,
    );
    expect(html).toContain("GrupoX");
    expect(html).toContain("ProyectoAlfa");
    expect(html).toContain("ProyectoAlfa — GrupoX");
    expect(html).toContain('href="/works/work-1"');
  });

  it("renderiza solo el nombre del proyecto cuando no tiene grupo", () => {
    const html = renderToString(
      <TaskGroupHeader work={{ id: "work-2", name: "ProyectoBeta", status: "IN_PROGRESS", group: null }} />,
    );
    expect(html).toContain("ProyectoBeta");
    expect(html).not.toContain("—");
  });

  it("incluye atributos de accesibilidad", () => {
    const html = renderToString(
      <TaskGroupHeader work={{ id: "work-3", name: "ProyectoGamma", status: "IN_PROGRESS", group: { id: "group-2", name: "GrupoY" } }} />,
    );
    expect(html).toContain('aria-label="Proyecto: ProyectoGamma. Grupo: GrupoY"');
    expect(html).toContain('title="ProyectoGamma — GrupoY"');
  });
});
