import { describe, it, expect } from "vitest";
import { parseTags, normalizeTagName, tagsBySymbol } from "@/lib/domain/tags/parser";

describe("parseTags — sintaxis básica (FR-007)", () => {
  it("reconoce las tres etiquetas del ejemplo canónico de la spec", () => {
    const r = parseTags("Comprar perfiles de hierro #Compras @Metalurgica /Tina");
    expect(r.tags).toEqual([
      { symbol: "#", name: "Compras", start: 27, end: 35 },
      { symbol: "@", name: "Metalurgica", start: 36, end: 48 },
      { symbol: "/", name: "Tina", start: 49, end: 54 },
    ]);
    expect(r.displayText).toBe("Comprar perfiles de hierro");
  });

  it("etiqueta al inicio del texto", () => {
    const r = parseTags("#Diseño pasar planos");
    expect(r.tags[0]).toMatchObject({ symbol: "#", name: "Diseño" });
    expect(r.displayText).toBe("pasar planos");
  });

  it("acepta nombres con acentos, números, guiones y puntos internos", () => {
    const r = parseTags("Tarea /Tina-2 #Metalúrgica @juan.perez");
    expect(r.tags.map((t) => t.name)).toEqual(["Tina-2", "Metalúrgica", "juan.perez"]);
  });

  it("el punto final de oración no entra en el nombre", () => {
    const r = parseTags("Comprar hierros #Compras.");
    expect(r.tags[0].name).toBe("Compras");
  });
});

describe("parseTags — símbolo $ (T003)", () => {
  it("'$Alta' se reconoce como tag con symbol '$' y name 'Alta'", () => {
    const r = parseTags("Tarea $Alta");
    expect(r.tags).toEqual([{ symbol: "$", name: "Alta", start: 6, end: 11 }]);
    expect(r.displayText).toBe("Tarea");
  });

  it("'$$' escapa a '$' literal (no es tag)", () => {
    const r = parseTags("precio $$100");
    expect(r.tags).toEqual([]);
    expect(r.displayText).toBe("precio $100");
  });

  it("combinación 'Comprar #Compras $Alta /Tina' reconoce los tres símbolos", () => {
    const r = parseTags("Comprar #Compras $Alta /Tina");
    expect(r.tags.map((t) => ({ symbol: t.symbol, name: t.name }))).toEqual([
      { symbol: "#", name: "Compras" },
      { symbol: "$", name: "Alta" },
      { symbol: "/", name: "Tina" },
    ]);
    expect(r.displayText).toBe("Comprar");
  });

  it("combinación con los cuatro símbolos '/ # @ $' se reconocen todos vía tagsBySymbol", () => {
    const r = parseTags("Tarea /Tina #Compras @Metalurgica $Alta final");
    expect(r.tags.map((t) => ({ symbol: t.symbol, name: t.name }))).toEqual([
      { symbol: "/", name: "Tina" },
      { symbol: "#", name: "Compras" },
      { symbol: "@", name: "Metalurgica" },
      { symbol: "$", name: "Alta" },
    ]);
    expect(r.displayText).toBe("Tarea final");
    const g = tagsBySymbol(r.tags);
    expect(g).toEqual({
      "/": ["Tina"],
      "#": ["Compras"],
      "@": ["Metalurgica"],
      "$": ["Alta"],
    });
  });

  it("'$' seguido de espacio o de nada no es tag", () => {
    const r1 = parseTags("precio $ final");
    expect(r1.tags).toEqual([]);
    expect(r1.displayText).toBe("precio $ final");

    const r2 = parseTags("precio final $");
    expect(r2.tags).toEqual([]);
    expect(r2.displayText).toBe("precio final $");
  });
});

describe("parseTags — literales y escapes (edge case spec)", () => {
  it("'perfil 20/20' no genera etiqueta (símbolo pegado a texto previo)", () => {
    const r = parseTags("cortar perfil 20/20 para marco");
    expect(r.tags).toEqual([]);
    expect(r.displayText).toBe("cortar perfil 20/20 para marco");
  });

  it("símbolo doble escapa a literal", () => {
    const r = parseTags("usar el ##3 y la barra //norte");
    expect(r.tags).toEqual([]);
    expect(r.displayText).toBe("usar el #3 y la barra /norte");
  });

  it("símbolo suelto sin nombre queda literal", () => {
    const r = parseTags("a / b # c @ d");
    expect(r.tags).toEqual([]);
    expect(r.displayText).toBe("a / b # c @ d");
  });
});

describe("normalizeTagName — matching insensible (assumption spec)", () => {
  it("mayúsculas y acentos no distinguen", () => {
    expect(normalizeTagName("Metalúrgica")).toBe(normalizeTagName("metalurgica"));
    // ñ se pliega a n: escribir "diseno" encuentra "Diseño"
    expect(normalizeTagName("DISEÑO")).toBe(normalizeTagName("diseno"));
  });
});

describe("tagsBySymbol — múltiples etiquetas por tarea", () => {
  it("agrupa por símbolo y deduplica insensible a acentos", () => {
    const r = parseTags("Tarea #Compras #compras #Metalúrgica @Diseño /Tina");
    const g = tagsBySymbol(r.tags);
    expect(g["#"]).toEqual(["Compras", "Metalúrgica"]);
    expect(g["@"]).toEqual(["Diseño"]);
    expect(g["/"]).toEqual(["Tina"]);
  });
});
