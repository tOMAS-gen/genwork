import { describe, it, expect } from "vitest";
import { searchUserCandidates, type UserCandidate } from "@/lib/domain/users/matching";

/**
 * T002 (037-busqueda-miembros) — tests de dominio para búsqueda de usuarios candidatos.
 * Función pura, sin I/O: searchUserCandidates(candidates, query, existingMemberIds).
 */

const candidates: UserCandidate[] = [
  { id: "u-ana", name: "Ana Pérez", email: "ana.perez@gen.net.ar" },
  { id: "u-juan", name: "Juan Gómez", email: "juan.gomez@gen.net.ar" },
  { id: "u-pedro", name: "Pedro Ananías", email: "pedro.ananias@gen.net.ar" },
];

describe("searchUserCandidates — coincidencia por nombre", () => {
  it("matchea por substring en el medio del nombre, no solo por prefijo", () => {
    const r = searchUserCandidates(candidates, "erez", new Set());
    expect(r.map((c) => c.id)).toEqual(["u-ana"]);
  });
});

describe("searchUserCandidates — coincidencia por email", () => {
  it("matchea por substring dentro del email", () => {
    const r = searchUserCandidates(candidates, "gomez@gen", new Set());
    expect(r.map((c) => c.id)).toEqual(["u-juan"]);
  });
});

describe("searchUserCandidates — insensible a mayúsculas", () => {
  it("query en mayúsculas encuentra nombre en minúsculas/mixtas", () => {
    const r = searchUserCandidates(candidates, "ANA", new Set());
    // "ANA" matchea tanto a Ana Pérez (nombre) como a Pedro Ananías ("Ana" dentro de "Ananías")
    expect(r.map((c) => c.id)).toContain("u-ana");
  });
});

describe("searchUserCandidates — insensible a tildes", () => {
  it("query sin tilde encuentra nombre con tilde (perez → Pérez)", () => {
    const r = searchUserCandidates(candidates, "perez", new Set());
    expect(r.map((c) => c.id)).toEqual(["u-ana"]);
  });
});

describe("searchUserCandidates — exclusión de ya-miembros", () => {
  it("un usuario cuyo id está en existingMemberIds nunca aparece, aunque matchee", () => {
    const r = searchUserCandidates(candidates, "perez", new Set(["u-ana"]));
    expect(r.map((c) => c.id)).not.toContain("u-ana");
    expect(r).toEqual([]);
  });
});

describe("searchUserCandidates — límite de resultados", () => {
  it("con más de 8 candidatos que matchean, el resultado tiene como máximo 8", () => {
    const many: UserCandidate[] = Array.from({ length: 12 }, (_, i) => ({
      id: `u-${i}`,
      name: `Persona Test ${String(i).padStart(2, "0")}`,
      email: `persona${i}@gen.net.ar`,
    }));
    const r = searchUserCandidates(many, "persona", new Set());
    expect(r.length).toBe(8);
  });
});

describe("searchUserCandidates — orden de relevancia", () => {
  it("coincidencia al inicio de nombre aparece antes que coincidencia en el medio", () => {
    const items: UserCandidate[] = [
      { id: "u-mid", name: "Marcos Ricardo", email: "mid@gen.net.ar" }, // "rica" en el medio
      { id: "u-start", name: "Ricardo Núñez", email: "start@gen.net.ar" }, // empieza con "rica"
    ];
    const r = searchUserCandidates(items, "rica", new Set());
    expect(r.map((c) => c.id)).toEqual(["u-start", "u-mid"]);
  });

  it("entre dos con el mismo tipo de match, orden alfabético por nombre", () => {
    const items: UserCandidate[] = [
      { id: "u-b", name: "Bruno Aguilar", email: "bruno@gen.net.ar" },
      { id: "u-a", name: "Ana Aguilar", email: "ana@gen.net.ar" },
    ];
    const r = searchUserCandidates(items, "aguilar", new Set());
    expect(r.map((c) => c.id)).toEqual(["u-a", "u-b"]);
  });
});

describe("searchUserCandidates — casos vacíos", () => {
  it("query vacío matchea a todos los candidatos (substring vacío)", () => {
    const r = searchUserCandidates(candidates, "", new Set());
    expect(r.length).toBe(candidates.length);
  });

  it("query sin ningún resultado → array vacío", () => {
    const r = searchUserCandidates(candidates, "xyz-inexistente", new Set());
    expect(r).toEqual([]);
  });

  it("lista de candidatos vacía → array vacío", () => {
    const r = searchUserCandidates([], "ana", new Set());
    expect(r).toEqual([]);
  });
});
