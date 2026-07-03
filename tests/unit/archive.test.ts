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
  state: "DONE" as const,
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
