import { describe, it, expect } from "vitest";
import {
  groupSectorsByScope,
  sectionDomId,
  GLOBAL_SECTION_KEY,
  PERSONAL_SECTION_KEY,
  groupSectionKey,
} from "@/components/sectors/groupSectorsByScope";
import type { SectorCardData } from "@/components/sectors/SectorCard";

type Metrics = { total: number; done: number; pending: number };

const metrics = (total = 0, done = 0): Metrics => ({ total, done, pending: total - done });

const global = (name: string, m: Metrics = metrics()): SectorCardData => ({
  id: `global-${name}`,
  name,
  color: null,
  scope: { type: "GLOBAL" },
  metrics: m,
});

const personal = (name: string, m: Metrics = metrics()): SectorCardData => ({
  id: `personal-${name}`,
  name,
  color: null,
  scope: { type: "PERSONAL", ownerId: "u1" },
  metrics: m,
});

const inGroup = (
  groupId: string,
  groupName: string | undefined,
  name: string,
  m: Metrics = metrics(),
): SectorCardData => ({
  id: `${groupId}-${name}`,
  name,
  color: null,
  scope: { type: "GROUP", groupId, groupName },
  metrics: m,
});

describe("groupSectorsByScope — agrupación (feature 060)", () => {
  it("devuelve [] con entrada vacía", () => {
    expect(groupSectorsByScope([])).toEqual([]);
  });

  it("agrupa un solo ámbito en una única sección", () => {
    const out = groupSectorsByScope([personal("uno"), personal("dos")]);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe(PERSONAL_SECTION_KEY);
    expect(out[0].kind).toBe("PERSONAL");
    expect(out[0].title).toBe("Personal");
    expect(out[0].count).toBe(2);
  });

  it("no genera secciones para grupos sin sectores", () => {
    const out = groupSectorsByScope([global("Comercial")]);
    expect(out.map((s) => s.key)).toEqual([GLOBAL_SECTION_KEY]);
  });

  it("separa dos grupos distintos que comparten nombre (key por groupId)", () => {
    const out = groupSectorsByScope([
      inGroup("g1", "Ventas", "alfa"),
      inGroup("g2", "Ventas", "beta"),
    ]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((s) => s.key))).toEqual(
      new Set([groupSectionKey("g1"), groupSectionKey("g2")]),
    );
  });

  it("usa un título de reserva si el grupo no trae nombre", () => {
    const out = groupSectorsByScope([inGroup("g1", undefined, "alfa")]);
    expect(out[0].title).toBe("Sin grupo");
    expect(out[0].groupId).toBe("g1");
  });

  it("manda a GLOBAL un scope GROUP sin groupId en vez de romper", () => {
    const roto = {
      id: "x",
      name: "roto",
      color: null,
      scope: { type: "GROUP" },
      metrics: metrics(),
    } as unknown as SectorCardData;
    const out = groupSectorsByScope([roto]);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe(GLOBAL_SECTION_KEY);
  });

  it("no muta el array de entrada", () => {
    const src = [personal("z"), global("a"), personal("b")];
    const copia = [...src];
    groupSectorsByScope(src, "pending");
    expect(src).toEqual(copia);
  });
});

describe("groupSectorsByScope — orden de secciones", () => {
  const catalogo = () => [
    inGroup("gc", "Genwork", "work-spec", metrics(10, 9)),
    personal("mis-cosas", metrics(4, 0)),
    inGroup("ga", "Álamo", "alfa", metrics(2, 1)),
    global("Comercial", metrics(6, 3)),
    inGroup("gb", "Beta", "beta", metrics(8, 0)),
  ];

  it("orden canónico por defecto: GLOBAL → grupos A-Z → PERSONAL", () => {
    const out = groupSectorsByScope(catalogo());
    expect(out.map((s) => s.title)).toEqual(["Global", "Álamo", "Beta", "Genwork", "Personal"]);
  });

  it("pliega los acentos al ordenar grupos alfabéticamente", () => {
    const out = groupSectorsByScope([
      inGroup("g2", "Bravo", "b"),
      inGroup("g1", "Álamo", "a"),
    ]);
    expect(out.map((s) => s.title)).toEqual(["Álamo", "Bravo"]);
  });

  it("sort=pending ordena por pendientes desc y GLOBAL/PERSONAL compiten en el ranking", () => {
    // pendientes: Beta 8, Personal 4, Global 3, Álamo 1, Genwork 1
    const out = groupSectorsByScope(catalogo(), "pending");
    expect(out.map((s) => s.title)).toEqual(["Beta", "Personal", "Global", "Álamo", "Genwork"]);
  });

  it("sort=tasks ordena por total de tareas desc", () => {
    // totales: Genwork 10, Beta 8, Global 6, Personal 4, Álamo 2
    const out = groupSectorsByScope(catalogo(), "tasks");
    expect(out.map((s) => s.title)).toEqual(["Genwork", "Beta", "Global", "Personal", "Álamo"]);
  });

  it("sort=progress ordena por done/total desc y manda las secciones sin tareas al final", () => {
    // progreso: Genwork .9, Global .5, Álamo .5, Beta 0, Personal 0.
    // Global y Álamo empatan: desempata el orden canónico, que pone GLOBAL primero.
    const out = groupSectorsByScope(catalogo(), "progress");
    expect(out.map((s) => s.title)).toEqual(["Genwork", "Global", "Álamo", "Beta", "Personal"]);
  });

  it("desempata por el orden canónico cuando la métrica empata", () => {
    const empatadas = [
      personal("p", metrics(2, 0)),
      inGroup("gb", "Beta", "b", metrics(2, 0)),
      global("g", metrics(2, 0)),
      inGroup("ga", "Alfa", "a", metrics(2, 0)),
    ];
    const out = groupSectorsByScope(empatadas, "pending");
    expect(out.map((s) => s.title)).toEqual(["Global", "Alfa", "Beta", "Personal"]);
  });
});

describe("groupSectorsByScope — orden de sectores dentro de la sección", () => {
  const dentro = () => [
    global("Zeta", metrics(10, 9)),
    global("Alfa", metrics(3, 0)),
    global("Beta", metrics(8, 4)),
  ];

  it("sort=name ordena alfabéticamente", () => {
    const [seccion] = groupSectorsByScope(dentro(), "name");
    expect(seccion.sectors.map((s) => s.name)).toEqual(["Alfa", "Beta", "Zeta"]);
  });

  it("sort=pending ordena por pendientes desc", () => {
    // pendientes: Beta 4, Alfa 3, Zeta 1
    const [seccion] = groupSectorsByScope(dentro(), "pending");
    expect(seccion.sectors.map((s) => s.name)).toEqual(["Beta", "Alfa", "Zeta"]);
  });

  it("sort=tasks ordena por total desc", () => {
    const [seccion] = groupSectorsByScope(dentro(), "tasks");
    expect(seccion.sectors.map((s) => s.name)).toEqual(["Zeta", "Beta", "Alfa"]);
  });

  it("sort=progress ordena por avance desc, con 0 para los sectores sin tareas", () => {
    const [seccion] = groupSectorsByScope([...dentro(), global("Vacio", metrics(0, 0))], "progress");
    expect(seccion.sectors.map((s) => s.name)).toEqual(["Zeta", "Beta", "Alfa", "Vacio"]);
  });

  it("desempata alfabéticamente con métricas iguales", () => {
    const [seccion] = groupSectorsByScope(
      [global("Zeta", metrics(2, 1)), global("Alfa", metrics(2, 1))],
      "pending",
    );
    expect(seccion.sectors.map((s) => s.name)).toEqual(["Alfa", "Zeta"]);
  });
});

describe("groupSectorsByScope — agregados", () => {
  it("suma count, pending, total y done de la sección", () => {
    const [seccion] = groupSectorsByScope([
      global("a", metrics(10, 4)),
      global("b", metrics(5, 5)),
    ]);
    expect(seccion.count).toBe(2);
    expect(seccion.total).toBe(15);
    expect(seccion.done).toBe(9);
    expect(seccion.pending).toBe(6);
    expect(seccion.progress).toBeCloseTo(9 / 15);
  });

  it("progress es 0 cuando la sección no tiene tareas (sin dividir por cero)", () => {
    const [seccion] = groupSectorsByScope([global("a"), global("b")]);
    expect(seccion.total).toBe(0);
    expect(seccion.progress).toBe(0);
  });
});

describe("sectionDomId", () => {
  it("sanitiza los caracteres que no sirven como id de DOM", () => {
    expect(sectionDomId(GLOBAL_SECTION_KEY)).toBe("sectors-section-scope-global");
    expect(sectionDomId(groupSectionKey("41b7c5ff-a7cc-4ba5"))).toBe(
      "sectors-section-group-41b7c5ff-a7cc-4ba5",
    );
  });

  it("produce ids distintos para secciones distintas", () => {
    const ids = [GLOBAL_SECTION_KEY, PERSONAL_SECTION_KEY, groupSectionKey("g1")].map(sectionDomId);
    expect(new Set(ids).size).toBe(3);
  });
});
