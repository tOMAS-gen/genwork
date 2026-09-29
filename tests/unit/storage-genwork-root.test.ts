/**
 * Raíz por empresa `GENWORK_<EMPRESA>` en Nextcloud: carpetas de grupo y
 * personales (por email) bajo la raíz, anti-duplicado del nombre del proyecto,
 * renombrar archivos, y snapshot de datos al archivar.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const davMock = vi.hoisted(() => ({
  exists: vi.fn(),
  createDirectory: vi.fn(),
  moveFile: vi.fn(),
}));

vi.mock("webdav", () => ({
  createClient: vi.fn(() => davMock),
}));

import { NextcloudProvider } from "@/lib/storage/nextcloud";
import type { NextcloudConfig } from "@/lib/storage/provider";
import { writeArchiveSnapshot } from "@/lib/domain/archive/snapshot";
import type { ArchivableWork } from "@/lib/domain/archive/load";

const cfg: NextcloudConfig = {
  url: "https://nube.example.com",
  adminUser: "admin",
  adminPassword: "secret",
};

/** Filesystem WebDAV en memoria: `exists` responde según lo creado. */
function fakeFs(initial: string[] = []) {
  const paths = new Set(initial);
  davMock.exists.mockImplementation(async (p: string) => paths.has(p));
  davMock.createDirectory.mockImplementation(async (p: string) => {
    paths.add(p);
  });
  return paths;
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Cuerpos de los POST de share OCS: `{ path, shareWith, shareType }`. */
function shares() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/files_sharing/api/v1/shares"))
    .map(([, init]) => Object.fromEntries(new URLSearchParams((init as RequestInit).body as string)));
}

beforeEach(() => {
  vi.resetAllMocks();
  fetchMock = vi.fn(async () => ({
    status: 200,
    json: async () => ({ ocs: { meta: { statuscode: 200 } } }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GENWORK_ORG", "gen");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("NextcloudProvider — raíz GENWORK_<EMPRESA>", () => {
  it("createGroupFolder: /GENWORK_GEN/{GRUPO} compartida con el grupo", async () => {
    fakeFs();
    const provider = new NextcloudProvider(cfg);

    const res = await provider.createGroupFolder({ groupId: "g1", groupName: "Ventas Norte" });

    expect(res.storageFolderId).toBe("/GENWORK_GEN/VENTAS-NORTE");
    expect(shares()).toEqual([
      expect.objectContaining({ path: "/GENWORK_GEN/VENTAS-NORTE", shareWith: "gw-Ventas Norte" }),
    ]);
  });

  it("createWorkFolder de grupo: /GENWORK_GEN/{GRUPO}/{PROYECTO} y re-comparte la carpeta del grupo", async () => {
    const fs = fakeFs();
    const provider = new NextcloudProvider(cfg);

    const { folderPath } = await provider.createWorkFolder({
      scope: { groupName: "Ventas", storageGroupId: "gw-Ventas" },
      workName: "INFORME_007",
    });

    expect(folderPath).toBe("/GENWORK_GEN/VENTAS/INFORME_007");
    expect(fs.has("/GENWORK_GEN/VENTAS/INFORME_007")).toBe(true);
    expect(shares()).toEqual([
      expect.objectContaining({ path: "/GENWORK_GEN/VENTAS", shareWith: "gw-Ventas", shareType: "1" }),
    ]);
  });

  it("createWorkFolder personal: /GENWORK_GEN/{email}/{PROYECTO} compartida con el usuario", async () => {
    fakeFs();
    const provider = new NextcloudProvider(cfg);

    const { folderPath } = await provider.createWorkFolder({
      scope: { personalStorageUserId: "tomas@gen.net.ar", personalEmail: "Tomas@Gen.net.ar" },
      workName: "MI-PROYECTO_012",
    });

    expect(folderPath).toBe("/GENWORK_GEN/tomas@gen.net.ar/MI-PROYECTO_012");
    expect(shares()).toEqual([
      expect.objectContaining({
        path: "/GENWORK_GEN/tomas@gen.net.ar",
        shareWith: "tomas@gen.net.ar",
        shareType: "0",
      }),
    ]);
  });

  it("si ya existe una carpeta con ese nombre (creada a mano), agrega -2, -3…", async () => {
    fakeFs(["/GENWORK_GEN/VENTAS/INFORME_007", "/GENWORK_GEN/VENTAS/INFORME_007-2"]);
    const provider = new NextcloudProvider(cfg);

    const { folderPath } = await provider.createWorkFolder({
      scope: { groupName: "Ventas" },
      workName: "INFORME_007",
    });

    expect(folderPath).toBe("/GENWORK_GEN/VENTAS/INFORME_007-3");
  });

  it("sin GENWORK_ORG conserva la estructura previa", async () => {
    vi.stubEnv("GENWORK_ORG", "");
    fakeFs();
    const provider = new NextcloudProvider(cfg);

    const group = await provider.createWorkFolder({
      scope: { groupName: "Ventas" },
      workName: "INFORME_007",
    });
    const personal = await provider.createWorkFolder({
      scope: { personalStorageUserId: "u@x.com", personalEmail: "u@x.com" },
      workName: "INFORME_008",
    });

    expect(group.folderPath).toBe("/genwork/Ventas/INFORME_007");
    expect(personal.folderPath).toBe("/genwork-personal/u@x.com/INFORME_008");
  });
});

describe("NextcloudProvider.rename", () => {
  it("renombra dentro del mismo directorio", async () => {
    fakeFs(["/GENWORK_GEN/VENTAS/INFORME_007/plano.pdf"]);
    const provider = new NextcloudProvider(cfg);

    const res = await provider.rename({
      path: "/GENWORK_GEN/VENTAS/INFORME_007/plano.pdf",
      newName: "plano final.pdf",
    });

    expect(res.path).toBe("/GENWORK_GEN/VENTAS/INFORME_007/plano final.pdf");
    expect(davMock.moveFile).toHaveBeenCalledWith(
      "/GENWORK_GEN/VENTAS/INFORME_007/plano.pdf",
      "/GENWORK_GEN/VENTAS/INFORME_007/plano final.pdf",
    );
  });

  it("ALREADY_EXISTS si el destino ya existe, sin mover", async () => {
    fakeFs(["/P/a.pdf", "/P/b.pdf"]);
    const provider = new NextcloudProvider(cfg);

    await expect(provider.rename({ path: "/P/a.pdf", newName: "b.pdf" })).rejects.toMatchObject({
      code: "ALREADY_EXISTS",
    });
    expect(davMock.moveFile).not.toHaveBeenCalled();
  });

  it("NOT_FOUND si el origen no existe", async () => {
    fakeFs();
    const provider = new NextcloudProvider(cfg);

    await expect(provider.rename({ path: "/P/x.pdf", newName: "y.pdf" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("writeArchiveSnapshot — datos del proyecto junto a sus archivos, sin ZIP", () => {
  const work: ArchivableWork = {
    id: "work-1",
    name: "Informe",
    description: "Desc",
    status: "ARCHIVED",
    folderSeq: 7,
    folderPath: "/GENWORK_GEN/_archivados/VENTAS/INFORME_007",
    groupName: "Ventas",
    ownerEmail: null,
    dueDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    docContent: { type: "doc", content: [] },
    objectives: [],
    tasks: [
      {
        displayText: "Hacer algo",
        rawText: "Hacer algo",
        statusType: "FINAL",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        completedAt: new Date("2026-01-03T00:00:00.000Z"),
        creatorName: "Ana",
        completedByName: "Ana",
        tags: [],
      },
    ],
  };

  it("sube proyecto.json, tareas.md y documentacion.html a {carpeta}/_genwork", async () => {
    const upload = vi.fn(async (input: { folderPath: string; fileName: string }) => ({
      filePath: `${input.folderPath}/${input.fileName}`,
    }));
    const target = "/GENWORK_GEN/_archivados/VENTAS/INFORME_007";

    const files = await writeArchiveSnapshot({ upload }, work, target);

    expect(files).toEqual(["proyecto.json", "tareas.md", "documentacion.html"]);
    for (const call of upload.mock.calls) {
      expect(call[0].folderPath).toBe(`${target}/_genwork`);
    }
    const json = JSON.parse(
      (upload.mock.calls[0][0] as unknown as { data: Buffer }).data.toString("utf8"),
    );
    expect(json).toMatchObject({
      id: "work-1",
      name: "Informe",
      groupName: "Ventas",
      folderPath: target,
      tasks: [expect.objectContaining({ displayText: "Hacer algo" })],
    });
    expect(json.archivedAt).toEqual(expect.any(String));
  });
});
