import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { SectorSectionHeader } from "@/components/sectors/SectorSectionHeader";
import type { SectorSection } from "@/components/sectors/groupSectorsByScope";

/** React intercala marcadores `<!-- -->` entre expresiones adyacentes. */
const render = (node: React.ReactElement) => renderToString(node).replace(/<!-- -->/g, "");

const section = (over: Partial<SectorSection> = {}): SectorSection => ({
  key: "group:g1",
  kind: "GROUP",
  title: "Genstock",
  groupId: "g1",
  sectors: [],
  count: 7,
  pending: 4,
  total: 10,
  done: 6,
  progress: 0.6,
  ...over,
});

describe("SectorSectionHeader (feature 060)", () => {
  it("muestra el título en mayúsculas y el conteo de sectores", () => {
    const html = render(<SectorSectionHeader section={section()} open />);
    expect(html).toContain("GENSTOCK");
    expect(html).toContain("(7)");
    expect(html).toContain('title="7 sectores"');
  });

  it("usa el singular cuando la sección tiene un solo sector", () => {
    const html = render(<SectorSectionHeader section={section({ count: 1 })} open />);
    expect(html).toContain('title="1 sector"');
  });

  it("muestra el badge de pendientes con etiqueta accesible", () => {
    const html = render(<SectorSectionHeader section={section()} open />);
    expect(html).toContain("4 tareas no finalizadas en Genstock");
  });

  it("oculta el badge cuando no hay pendientes", () => {
    const html = render(<SectorSectionHeader section={section({ pending: 0 })} open />);
    expect(html).not.toContain("no finalizadas");
  });

  it("rota el chevron solo cuando la sección está abierta", () => {
    expect(render(<SectorSectionHeader section={section()} open />)).toContain("rotate-90");
    expect(render(<SectorSectionHeader section={section()} open={false} />)).not.toContain(
      "rotate-90",
    );
  });

  it("pinta el punto de color del grupo cuando lo recibe", () => {
    const html = render(<SectorSectionHeader section={section()} open color="#22c55e" />);
    expect(html).toContain("#22c55e");
  });

  it("cae al ícono de ámbito cuando el grupo no tiene color", () => {
    const html = render(<SectorSectionHeader section={section()} open color={null} />);
    expect(html).not.toContain("background-color");
    expect(html).toContain("<svg");
  });
});
