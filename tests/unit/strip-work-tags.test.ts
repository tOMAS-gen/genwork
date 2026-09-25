import { describe, it, expect } from "vitest";
import { stripWorkTags } from "@/lib/domain/tags/stripWorkTags";
import { parseTags } from "@/lib/domain/tags/parser";

/**
 * objetivos: el clonado de plantillas saca los `/proyecto` del rawText. Si
 * quedaran, al editar la copia `saveTask` resolvería el `/` de nuevo y la
 * tarea se mudaría al proyecto (o plantilla) de origen.
 */

/** Tags que no son de trabajo, como símbolo+nombre (lo que no debe cambiar). */
const otherTags = (rawText: string) =>
  parseTags(rawText)
    .tags.filter((t) => t.symbol !== "/")
    .map((t) => `${t.symbol}${t.name}`);

describe("stripWorkTags", () => {
  it("saca un /proyecto en el medio y colapsa el espacio doble", () => {
    expect(stripWorkTags("Revisar /Obra planos")).toBe("Revisar planos");
  });

  it("saca un /proyecto al final y al principio (trim)", () => {
    expect(stripWorkTags("Revisar planos /Obra")).toBe("Revisar planos");
    expect(stripWorkTags("/Obra Revisar planos")).toBe("Revisar planos");
  });

  it("saca todos los tags / de la tarea", () => {
    expect(stripWorkTags("/Obra Revisar /Otra planos /Tercera")).toBe("Revisar planos");
  });

  it("respeta el escape //: no es un tag y queda intacto", () => {
    expect(stripWorkTags("Ver //ruta del server")).toBe("Ver //ruta del server");
    expect(stripWorkTags("Ver //ruta /Obra")).toBe("Ver //ruta");
  });

  it("un / sin borde (\"20/20\") no es tag y no se toca", () => {
    expect(stripWorkTags("Control 20/20 /Obra")).toBe("Control 20/20");
  });

  it("deja intactos #, @ y $", () => {
    const raw = "Pintar #Taller @Ana $Urgente /Obra";
    const out = stripWorkTags(raw);
    expect(out).toBe("Pintar #Taller @Ana $Urgente");
    expect(otherTags(out)).toEqual(otherTags(raw));
  });

  it("sin tags / devuelve el texto tal cual (ni siquiera recorta)", () => {
    expect(stripWorkTags("Pintar #Taller")).toBe("Pintar #Taller");
    expect(stripWorkTags("  con  espacios  ")).toBe("  con  espacios  ");
    expect(stripWorkTags("")).toBe("");
  });

  it("el punto final de oración no es parte del tag y queda", () => {
    expect(stripWorkTags("Terminar para /Obra.")).toBe("Terminar para .");
    expect(parseTags(stripWorkTags("Terminar para /Obra.")).tags).toEqual([]);
  });

  it("colapsa tabs y espacios que quedan dobles", () => {
    expect(stripWorkTags("Revisar\t/Obra\tplanos")).toBe("Revisar planos");
  });

  it("nombres con acentos, guiones y puntos internos se sacan enteros", () => {
    expect(stripWorkTags("Medir /Metalúrgica-Sur.2 hoy")).toBe("Medir hoy");
  });

  it("un símbolo pegado después del tag no se vuelve tag nuevo (se escapa)", () => {
    // "/Obra#x": el # no tenía borde (literal). Sin el tag quedaría "#x", que
    // sí sería un tag de sector; se duplica para que siga siendo literal.
    for (const raw of ["/Obra#x hacer", "hacer /Obra@x", "/Obra$x", "a /Obra/x"]) {
      const out = stripWorkTags(raw);
      expect(parseTags(out).tags).toEqual([]);
      expect(parseTags(out).displayText).toBe(parseTags(raw).displayText);
    }
  });

  it("un escape pegado después del tag se conserva sin duplicar", () => {
    expect(stripWorkTags("/Obra##x")).toBe("##x");
    expect(parseTags("##x").displayText).toBe("#x");
  });

  it("el texto visible queda igual que antes (el tag / no se muestra)", () => {
    const raw = "Pintar /Obra #Taller la fachada @Ana";
    expect(parseTags(stripWorkTags(raw)).displayText).toBe(parseTags(raw).displayText);
  });
});
