import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  TemplateOptionList,
  TemplateSelector,
  templateTaskLabel,
  TEMPLATE_EMPTY_DESCRIPTION,
} from "@/components/works/TemplateSelector";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { CreateProjectDialog } = await import("@/components/projects/CreateProjectDialog");

describe("templateTaskLabel", () => {
  it("0, 1 y N", () => {
    expect(templateTaskLabel(0)).toBe("Sin tareas pendientes");
    expect(templateTaskLabel(1)).toBe("1 tarea pendiente");
    expect(templateTaskLabel(4)).toBe("4 tareas pendientes");
  });
});

describe("TemplateOptionList", () => {
  const items = [
    { id: "t1", name: "Instalación", description: null, meta: "3 tareas pendientes · Personal" },
    { id: "t2", name: "Pintura", description: null, meta: "Sin tareas pendientes · Grupo Obras" },
  ];

  it("sin plantillas muestra el estado vacío nuevo", () => {
    const html = renderToString(<TemplateOptionList items={[]} loading={false} error="" onSelect={() => {}} />);
    expect(html).toContain("No hay plantillas de objetivo");
    expect(html).toContain(TEMPLATE_EMPTY_DESCRIPTION.replace("⋮", "⋮").slice(0, 30));
  });

  it("lista nombre y meta; seleccionable marca aria-pressed", () => {
    const html = renderToString(
      <TemplateOptionList items={items} loading={false} error="" selectedId="t2" onSelect={() => {}} />,
    );
    expect(html).toContain("Instalación");
    expect(html).toContain("3 tareas pendientes · Personal");
    expect(html).toMatch(/is-selected" aria-pressed="true"/);
    expect(html).toContain('aria-pressed="false"');
  });

  it("sin selectedId (selector del dashboard) no usa aria-pressed", () => {
    const html = renderToString(<TemplateOptionList items={items} loading={false} error="" onSelect={() => {}} />);
    expect(html).not.toContain("aria-pressed");
  });

  it("muestra el error", () => {
    const html = renderToString(<TemplateOptionList items={[]} loading={false} error="Falló" onSelect={() => {}} />);
    expect(html).toContain("Falló");
  });
});

describe("textos de plantilla de objetivo", () => {
  it("el selector se titula 'Elegir plantilla de objetivo'", () => {
    const html = renderToString(<TemplateSelector open onClose={() => {}} onSelect={() => {}} />);
    expect(html).toContain("Elegir plantilla de objetivo");
  });

  it("CreateProjectDialog en modo plantilla rotula 'Título del objetivo' y 'Descripción'", () => {
    const html = renderToString(<CreateProjectDialog open isTemplate onClose={() => {}} onCreated={() => {}} />);
    expect(html).toContain("Nueva plantilla de objetivo");
    expect(html).toContain("Título del objetivo");
    expect(html).toContain(">Descripción<");
    expect(html).toContain("Crear plantilla");
  });

  it("CreateProjectDialog desde plantilla anuncia el objetivo que se agrega", () => {
    const html = renderToString(
      <CreateProjectDialog
        open
        template={{ id: "t1", name: "Instalación" }}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    ).replaceAll("<!-- -->", "");
    expect(html).toContain("Nuevo proyecto desde plantilla");
    expect(html).toContain("el objetivo «Instalación»");
  });
});
