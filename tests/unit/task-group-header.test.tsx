import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";

describe("TaskGroupHeader", () => {
  it("renderiza el nombre del proyecto como enlace", () => {
    const html = renderToString(<TaskGroupHeader work={{ id: "work-1", name: "ProyectoAlfa", status: "IN_PROGRESS" }} />);
    expect(html).toContain("ProyectoAlfa");
    expect(html).toContain('href="/works/work-1"');
  });

  it("incluye atributos de accesibilidad", () => {
    const html = renderToString(<TaskGroupHeader work={{ id: "work-2", name: "ProyectoBeta", status: "IN_PROGRESS" }} />);
    expect(html).toContain('aria-label="Proyecto: ProyectoBeta"');
    expect(html).toContain('title="ProyectoBeta"');
  });
});
