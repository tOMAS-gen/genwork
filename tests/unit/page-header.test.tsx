import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { PageHeader } from "@/components/ui/PageHeader";

// T40 (spec 066): la cabecera de raíz de la web es la de la app Android.
describe("PageHeader", () => {
  it("no dibuja el ícono de sección aunque se lo pasen", () => {
    const html = renderToString(
      <PageHeader title="Proyectos" description="Una línea." icon="projects" />,
    );
    expect(html).toContain("<h1>Proyectos</h1>");
    expect(html).not.toContain("page-header-icon");
  });

  it("título 20/700 sin regla, y punto de color en la cabecera de entidad", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const t40 = css.split("Spec 066, T40")[1];
    expect(t40).toMatch(/\.page-header \{[^}]*border-bottom: 0;/);
    expect(t40).toMatch(/\.page-header h1 \{[^}]*font-size: 20px;[^}]*font-weight: 700;/);
    expect(t40).toMatch(/\.breadcrumbs ol \{[^}]*font-size: 12px;/);
    for (const page of ["src/app/(main)/works/[id]/page.tsx", "src/app/(main)/sectors/[id]/page.tsx"]) {
      const source = readFileSync(page, "utf8");
      expect(source).toContain('className="work-dot"');
      expect(source).not.toContain('className="work-symbol"');
    }
  });
});
