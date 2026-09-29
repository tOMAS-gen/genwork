import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildArchivePackage, type ArchiveStorage } from "@/lib/domain/archive/builder";
import { tasksToMarkdown, docToHtml } from "@/lib/domain/archive/render";

const mockStorage = (files: Record<string, string>): ArchiveStorage => ({
  async list(folderPath) {
    return Object.keys(files).map((p) => ({
      name: path.basename(p),
      path: `${folderPath}/${p}`,
      isDirectory: false,
    }));
  },
  async read(filePath) {
    const rel = Object.keys(files).find((p) => filePath.endsWith(p));
    if (!rel) throw new Error(`missing ${filePath}`);
    return Readable.from([files[rel]]);
  },
});

const task = {
  displayText: "Armar estructura",
  rawText: "Armar estructura #Metalurgica /Tina",
  statusType: "FINAL" as const,
  createdAt: new Date("2026-07-01"),
  completedAt: new Date("2026-07-02"),
  creatorName: "Tomi",
  completedByName: "Tomi",
  tags: [
    { symbol: "#", name: "Metalurgica" },
    { symbol: "/", name: "Tina" },
  ],
};

describe("buildArchivePackage (FR-030/031)", () => {
  it("genera el ZIP con manifest completo: archivos + doc + tareas", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gw-archive-"));
    const zipPath = path.join(dir, "tina.zip");

    const manifest = await buildArchivePackage(
      mockStorage({ "diseño.pdf": "PDFDATA", "medidas.txt": "120x80" }),
      {
        workName: "Tina – Paneles",
        folderPath: "/genwork/Produccion/Tina",
        docContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Presupuesto" }] }] },
        tasks: [task],
      },
      zipPath,
    );

    expect(manifest.files.sort()).toEqual(["diseño.pdf", "medidas.txt"]);
    expect(manifest.taskCount).toBe(1);
    const zipStat = await stat(zipPath);
    expect(zipStat.size).toBeGreaterThan(0);
  });

  it("no incluye el snapshot `_genwork/` de un archivado anterior", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gw-archive-"));

    const manifest = await buildArchivePackage(
      mockStorage({ "plano.pdf": "PDF", "_genwork/tareas.md": "viejo", "_genwork/proyecto.json": "{}" }),
      { workName: "Tina", folderPath: "/GENWORK_GEN/PRODUCCION/TINA_001", docContent: null, tasks: [task] },
      path.join(dir, "tina.zip"),
    );

    expect(manifest.files).toEqual(["plano.pdf"]);
  });

  it("falla completa si un archivo no se puede leer → sin paquete usable (atómico)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gw-archive-"));
    const zipPath = path.join(dir, "fail.zip");
    const broken: ArchiveStorage = {
      async list() {
        return [{ name: "x.pdf", path: "/f/x.pdf", isDirectory: false }];
      },
      async read() {
        throw new Error("Nextcloud caído");
      },
    };

    await expect(
      buildArchivePackage(broken, {
        workName: "W",
        folderPath: "/f",
        docContent: null,
        tasks: [],
      }, zipPath),
    ).rejects.toThrow("Nextcloud caído");
  });

  it("trabajo sin carpeta (aún sin aprovisionar) exporta doc y tareas igual", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gw-archive-"));
    const zipPath = path.join(dir, "nodoc.zip");
    const manifest = await buildArchivePackage(
      mockStorage({}),
      { workName: "W", folderPath: null, docContent: null, tasks: [task] },
      zipPath,
    );
    expect(manifest.files).toEqual([]);
    const zipStat = await readFile(zipPath);
    expect(zipStat.length).toBeGreaterThan(0);
  });
});

describe("renderizadores legibles sin el sistema (FR-030)", () => {
  it("tareas.md conserva texto, etiquetas, estados, autores y fechas", () => {
    const md = tasksToMarkdown("Tina", [task]);
    expect(md).toContain("- [x] Armar estructura — #Metalurgica /Tina");
    expect(md).toContain("creada por Tomi el 2026-07-01");
    expect(md).toContain("realizada por Tomi el 2026-07-02");
  });

  it("documentacion.html renderiza el contenido ProseMirror", () => {
    const html = docToHtml("Tina", {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Presupuesto <ok>" }] }],
    });
    expect(html).toContain("<p>Presupuesto &lt;ok&gt;</p>");
    expect(html).toContain("<h1>Tina</h1>");
  });
});

describe("tareas.md con subtareas y objetivos (objetivos, D12)", () => {
  const base = {
    rawText: "",
    createdAt: new Date("2026-07-01"),
    completedAt: null,
    creatorName: "Tomi",
    completedByName: null,
    tags: [],
  };
  const t = (
    id: string,
    over: { parentId?: string | null; objectiveId?: string | null; done?: boolean } = {},
  ) => ({
    ...base,
    id,
    displayText: id,
    parentId: over.parentId ?? null,
    objectiveId: over.objectiveId ?? null,
    statusType: over.done ? ("FINAL" as const) : ("IN_PROGRESS" as const),
  });

  it("sin objetivos: sin encabezados de sección y la subtarea va con sangría debajo de su padre", () => {
    // La hija viene ANTES que el padre en la lista: igual se ubica debajo de él.
    const md = tasksToMarkdown("Tina", [t("Hija", { parentId: "Padre" }), t("Padre"), t("Suelta")]);
    expect(md).not.toContain("## ");
    const lines = md.split("\n");
    const iPadre = lines.indexOf("- [ ] Padre");
    expect(iPadre).toBeGreaterThan(-1);
    expect(lines[iPadre + 2]).toBe("  - [ ] Hija");
    expect(lines[iPadre + 3]).toBe("    - creada por Tomi el 2026-07-01");
    expect(md).toContain("3 tareas.");
  });

  it("sin objetivos: una tarea sin padre en la lista sale igual que antes", () => {
    const md = tasksToMarkdown("Tina", [task]);
    expect(md).toContain("\n- [x] Armar estructura — #Metalurgica /Tina\n  - creada por Tomi el 2026-07-01");
  });

  it("con objetivos: generales primero, después cada objetivo en orden con (hechas/total)", () => {
    const objectives = [
      { id: "o-diseno", title: "Diseño", description: "Planos y renders" },
      { id: "o-obra", title: "Obra", description: null },
    ];
    const md = tasksToMarkdown(
      "Casa",
      [
        t("Relevar"),
        t("Plano", { objectiveId: "o-diseno", done: true }),
        t("Render", { objectiveId: "o-diseno" }),
        t("Contenedor", { objectiveId: "o-obra" }),
        t("Hija A", { parentId: "Contenedor", objectiveId: "o-obra", done: true }),
        t("Hija B", { parentId: "Contenedor", objectiveId: "o-obra", done: true }),
      ],
      objectives,
    );

    const iGen = md.indexOf("## Tareas generales");
    const iDis = md.indexOf("## Objetivo: Diseño (1/2)");
    const iObra = md.indexOf("## Objetivo: Obra (2/2)"); // regla de contenedor: suman las hijas
    expect(iGen).toBeGreaterThan(-1);
    expect(iDis).toBeGreaterThan(iGen);
    expect(iObra).toBeGreaterThan(iDis);
    expect(md).toContain("## Objetivo: Diseño (1/2)\n\nPlanos y renders\n\n- [x] Plano");
    expect(md).toContain("- [ ] Contenedor\n  - creada por Tomi el 2026-07-01\n  - [x] Hija A");
    // El encabezado sigue contando todas las filas.
    expect(md).toContain("6 tareas.");
  });

  it("un objetivo sin tareas muestra _Sin tareas._ y sin generales no hay sección de generales", () => {
    const md = tasksToMarkdown(
      "Casa",
      [t("Plano", { objectiveId: "o-1" })],
      [
        { id: "o-1", title: "Diseño", description: null },
        { id: "o-2", title: "Vacío", description: null },
      ],
    );
    expect(md).not.toContain("## Tareas generales");
    expect(md).toContain("## Objetivo: Vacío (0/0)\n\n_Sin tareas._");
    expect(md.endsWith("_Sin tareas._\n")).toBe(true);
  });

  it("un objectiveId desconocido cae en generales (la tarea nunca se pierde)", () => {
    const md = tasksToMarkdown(
      "Casa",
      [t("Huérfana", { objectiveId: "o-borrado" }), t("Plano", { objectiveId: "o-1" })],
      [{ id: "o-1", title: "Diseño", description: null }],
    );
    const iGen = md.indexOf("## Tareas generales");
    expect(iGen).toBeGreaterThan(-1);
    expect(md.indexOf("- [ ] Huérfana")).toBeGreaterThan(iGen);
    expect(md.indexOf("- [ ] Huérfana")).toBeLessThan(md.indexOf("## Objetivo: Diseño"));
  });

  it("una hija va en la sección de su RAÍZ aunque su objectiveId esté desalineado", () => {
    const md = tasksToMarkdown(
      "Casa",
      [t("Padre", { objectiveId: "o-1" }), t("Hija", { parentId: "Padre", objectiveId: null })],
      [{ id: "o-1", title: "Diseño", description: null }],
    );
    expect(md).not.toContain("## Tareas generales");
    expect(md).toContain("## Objetivo: Diseño (0/1)");
    expect(md).toContain("  - [ ] Hija");
  });

  it("buildArchivePackage pasa los objetivos al tareas.md sin cambiar taskCount", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gw-archive-"));
    const zipPath = path.join(dir, "obj.zip");
    const manifest = await buildArchivePackage(
      mockStorage({}),
      {
        workName: "W",
        folderPath: null,
        docContent: null,
        tasks: [t("Plano", { objectiveId: "o-1" }), t("Suelta")],
        objectives: [{ id: "o-1", title: "Diseño", description: null }],
      },
      zipPath,
    );
    expect(manifest.taskCount).toBe(2);
  });
});
