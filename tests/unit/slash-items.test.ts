import { describe, it, expect } from "vitest";
import { getSlashItems, filterSlashItems } from "@/lib/domain/editor/slash-items";

describe("filterSlashItems — query vacío (FR-203)", () => {
  it("query vacío devuelve todos los ítems del catálogo", () => {
    const items = getSlashItems();
    expect(filterSlashItems(items, "")).toEqual(items);
  });

  it("query de solo espacios devuelve todos los ítems del catálogo", () => {
    const items = getSlashItems();
    expect(filterSlashItems(items, "   ")).toEqual(items);
  });
});

describe("filterSlashItems — filtro por título", () => {
  it("'encabezado' devuelve los 4 encabezados", () => {
    const items = getSlashItems();
    const r = filterSlashItems(items, "encabezado");
    expect(r.map((i) => i.id)).toEqual(["h1", "h2", "h3", "h4"]);
  });
});

describe("filterSlashItems — filtro por alias", () => {
  it("'titulo' devuelve Encabezado 1 (alias 'titulo') y Encabezado 2 (alias 'subtitulo' contiene 'titulo')", () => {
    const items = getSlashItems();
    const r = filterSlashItems(items, "titulo");
    expect(r.map((i) => i.id)).toEqual(["h1", "h2"]);
  });

  it("'vinetas' devuelve la Lista con viñetas", () => {
    const items = getSlashItems();
    const r = filterSlashItems(items, "vinetas");
    expect(r.map((i) => i.id)).toEqual(["bullet"]);
  });
});

describe("filterSlashItems — insensible a acentos y mayúsculas (FR-203)", () => {
  it("'ENCABEZADO' en mayúsculas da el mismo resultado que en minúsculas", () => {
    const items = getSlashItems();
    expect(filterSlashItems(items, "ENCABEZADO")).toEqual(filterSlashItems(items, "encabezado"));
  });

  it("'viñetas' (con ñ) da el mismo resultado que 'vinetas' (sin ñ)", () => {
    const items = getSlashItems();
    expect(filterSlashItems(items, "viñetas")).toEqual(filterSlashItems(items, "vinetas"));
  });
});

describe("filterSlashItems — sin coincidencias", () => {
  it("query sin coincidencias devuelve []", () => {
    const items = getSlashItems();
    expect(filterSlashItems(items, "xyz")).toEqual([]);
  });
});

describe("filterSlashItems — ítem Imagen", () => {
  it("'imagen' encuentra el ítem de imagen", () => {
    const items = getSlashItems();
    const r = filterSlashItems(items, "imagen");
    expect(r.map((i) => i.id)).toEqual(["image"]);
  });
});
