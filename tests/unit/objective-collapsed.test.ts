import { describe, expect, it, vi } from "vitest";
import {
  collapsedStorageKey,
  persistCollapsed,
  readCollapsedIds,
  serializeCollapsed,
} from "@/components/objectives/useCollapsedObjectives";

const storageWith = (value: string | null) => ({ getItem: vi.fn(() => value) });

describe("plegado de objetivos (localStorage)", () => {
  it("usa una clave por proyecto", () => {
    expect(collapsedStorageKey("w1")).toBe("gw:work-objectives-collapsed:w1");
  });

  it("lee el conjunto guardado y descarta lo que no es string", () => {
    expect(readCollapsedIds(storageWith('["a","b",3]'), "k")).toEqual(["a", "b"]);
  });

  it("JSON roto, valor que no es array, vacío o sin storage → []", () => {
    expect(readCollapsedIds(storageWith("{no"), "k")).toEqual([]);
    expect(readCollapsedIds(storageWith('{"a":1}'), "k")).toEqual([]);
    expect(readCollapsedIds(storageWith(null), "k")).toEqual([]);
    expect(readCollapsedIds(null, "k")).toEqual([]);
    const throwing = { getItem: () => { throw new Error("SecurityError"); } };
    expect(readCollapsedIds(throwing, "k")).toEqual([]);
  });

  it("serializa solo los objetivos que todavía existen", () => {
    expect(serializeCollapsed(new Set(["a", "borrado"]), ["a", "b"])).toBe('["a"]');
  });

  it("no escribe antes de la primera carga (no pisa lo guardado con una lista vacía)", () => {
    const storage = { setItem: vi.fn() };
    expect(persistCollapsed(storage, "k", new Set(["a"]), [], false)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("después de cargar escribe el conjunto podado", () => {
    const storage = { setItem: vi.fn() };
    expect(persistCollapsed(storage, "k", new Set(["a", "x"]), ["a"], true)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("k", '["a"]');
  });

  it("si el storage falla (modo privado) no rompe", () => {
    const storage = { setItem: () => { throw new Error("QuotaExceeded"); } };
    expect(persistCollapsed(storage, "k", new Set(["a"]), ["a"], true)).toBe(false);
  });
});
