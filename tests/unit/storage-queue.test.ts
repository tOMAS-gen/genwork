/**
 * T001 [US1] — Conteo de intentos de ADD_MEMBER/REMOVE_MEMBER frente a
 * dependencias todavía no listas (research.md R1).
 *
 * Hoy `processPending` incrementa `attempts` (y puede llevar el job a
 * `FAILED` prematuramente) cada vez que `runJob` lanza, sin distinguir entre:
 *   - "dependencia todavía no lista" (el grupo no tiene `nextcloudGroupId`
 *     porque su `CREATE_GROUP_FOLDER` sigue `PENDING`, o el usuario no tiene
 *     `nextcloudUserId` porque su `CREATE_USER` sigue `PENDING`) — NO debe
 *     consumir presupuesto de intentos.
 *   - un fallo real una vez resuelta la dependencia — SÍ debe consumir
 *     presupuesto de intentos (comportamiento actual, no debe regresionar).
 *
 * Este test debe fallar contra la implementación actual de
 * `src/lib/storage/queue.ts` (no distingue ambos casos todavía) — el fix es
 * la tarea T002.
 *
 * Estrategia de mocking: se stubean los límites de I/O — `prisma` (vía
 * `@/lib/db/client`) y `getStorageProvider` (vía `@/lib/storage/index`, el
 * mismo módulo que `queue.ts` importa como `./index`) — siguiendo el patrón
 * de mocking de Prisma ya usado en `tests/unit/storage-delete.test.ts` /
 * `tests/unit/storage-share.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  provisioningJobFindFirst: vi.fn(),
  provisioningJobUpdate: vi.fn(),
  groupFindUniqueOrThrow: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  workFindUnique: vi.fn(),
  workUpdate: vi.fn(),
  workUpdateMany: vi.fn(),
  getStorageProvider: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  createWorkFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  loadArchivableWork: vi.fn(),
  writeArchiveSnapshot: vi.fn(),
  shareScopeFolder: vi.fn(),
  fileShareFindMany: vi.fn(),
  fileShareUpdate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    provisioningJob: {
      findFirst: (...args: unknown[]) => mocks.provisioningJobFindFirst(...args),
      update: (...args: unknown[]) => mocks.provisioningJobUpdate(...args),
    },
    group: {
      findUniqueOrThrow: (...args: unknown[]) => mocks.groupFindUniqueOrThrow(...args),
    },
    user: {
      findUniqueOrThrow: (...args: unknown[]) => mocks.userFindUniqueOrThrow(...args),
    },
    fileShare: {
      findMany: (...args: unknown[]) => mocks.fileShareFindMany(...args),
      update: (...args: unknown[]) => mocks.fileShareUpdate(...args),
    },
    work: {
      findUnique: (...args: unknown[]) => mocks.workFindUnique(...args),
      update: (...args: unknown[]) => mocks.workUpdate(...args),
      updateMany: (...args: unknown[]) => mocks.workUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/storage/index", () => ({
  getStorageProvider: (...args: unknown[]) => mocks.getStorageProvider(...args),
}));

vi.mock("@/lib/domain/archive/load", () => ({
  loadArchivableWork: (...args: unknown[]) => mocks.loadArchivableWork(...args),
}));

vi.mock("@/lib/domain/archive/snapshot", () => ({
  writeArchiveSnapshot: (...args: unknown[]) => mocks.writeArchiveSnapshot(...args),
}));

// Importado después de registrar los mocks.
const { processPending } = await import("@/lib/storage/queue");

const NOW = new Date("2026-07-13T12:00:00.000Z");

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    kind: "ADD_MEMBER",
    status: "PENDING",
    attempts: 0,
    lastError: null,
    runAfter: new Date(NOW.getTime() - 1_000),
    createdAt: new Date(NOW.getTime() - 60_000),
    updatedAt: new Date(NOW.getTime() - 60_000),
    payload: { kind: "ADD_MEMBER", groupId: "group-1", userId: "user-1" },
    ...overrides,
  };
}

/**
 * Encola `job` como resultado de la próxima llamada a findFirst; todas las
 * llamadas subsiguientes (haya o no una segunda vuelta del loop de
 * `processPending`, según si el job terminó `FAILED`/`DONE` o hizo `break`
 * por backoff) devuelven `null` por default, sin dejar un `Once` sin
 * consumir que se filtre al siguiente test.
 */
function queueSingleJob(job: ReturnType<typeof makeJob>) {
  mocks.provisioningJobFindFirst.mockResolvedValue(null);
  mocks.provisioningJobFindFirst.mockResolvedValueOnce(job);
}

beforeEach(() => {
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  mocks.getStorageProvider.mockResolvedValue({
    addMember: mocks.addMember,
    removeMember: mocks.removeMember,
    createWorkFolder: mocks.createWorkFolder,
    deleteFolder: mocks.deleteFolder,
    moveFolder: mocks.moveFolder,
    shareScopeFolder: mocks.shareScopeFolder,
  });
  mocks.provisioningJobUpdate.mockResolvedValue(undefined);
  mocks.fileShareFindMany.mockResolvedValue([]);
});

describe("processPending — ADD_MEMBER/REMOVE_MEMBER vs. dependencia todavía no lista (R1)", () => {
  it("grupo sin CREATE_GROUP_FOLDER resuelto (nextcloudGroupId null) → NO incrementa attempts", async () => {
    const job = makeJob({ attempts: 0 });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: null });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });

    await processPending();

    expect(mocks.addMember).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledTimes(1);
    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.attempts).toBe(0);
    expect(data.status).toBe("PENDING");
  });

  it("usuario sin CREATE_USER resuelto (nextcloudUserId null) → NO incrementa attempts", async () => {
    const job = makeJob({ kind: "REMOVE_MEMBER", attempts: 2, payload: { kind: "REMOVE_MEMBER", groupId: "group-1", userId: "user-1" } });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: "nc-group-1" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: null });

    await processPending();

    expect(mocks.removeMember).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledTimes(1);
    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.attempts).toBe(2);
    expect(data.status).toBe("PENDING");
  });

  it("dependencia no lista cerca del límite de intentos → NO pasa a FAILED prematuramente", async () => {
    // attempts=9 (a 1 del MAX_ATTEMPTS=10 actual): con el bug de hoy, el
    // próximo incremento lo manda a FAILED aunque el fallo sea solo
    // "todavía no listo", no un error real.
    const job = makeJob({ attempts: 9 });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: null });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });

    await processPending();

    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.attempts).toBe(9);
    expect(data.status).toBe("PENDING");
    expect(data.status).not.toBe("FAILED");
  });

  it("dependencia no lista → reprograma con un runAfter corto (no el backoff exponencial normal)", async () => {
    const job = makeJob({ attempts: 9 });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: null });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });

    await processPending();

    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    const runAfter = data.runAfter as Date;
    // El backoff exponencial normal a attempts=9/10 sería del orden de
    // decenas de minutos (BASE_DELAY_MS * 2^8 ≈ 21min); la reprogramación
    // por dependencia no lista debe ser corta (del orden del ciclo del
    // ticker, ~30s) — acotamos holgadamente a 1 minuto.
    expect(runAfter.getTime() - NOW.getTime()).toBeLessThanOrEqual(60_000);
  });
});

describe("processPending — jobs de carpeta de work sin carpeta habilitada/creada (D10)", () => {
  it("MOVE_WORK_FOLDER con work sin nextcloudFolderPath → DONE sin mover en el provider", async () => {
    const job = makeJob({
      kind: "MOVE_WORK_FOLDER",
      payload: {
        kind: "MOVE_WORK_FOLDER",
        workId: "work-1",
        fromPath: "old/path",
        toPath: "new/path",
      },
    });
    queueSingleJob(job);
    mocks.workFindUnique.mockResolvedValue({ nextcloudFolderPath: null });

    await processPending();

    expect(mocks.moveFolder).not.toHaveBeenCalled();
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });

  it("RENAME_WORK_FOLDER con work sin nextcloudFolderPath → DONE sin renombrar en el provider", async () => {
    const job = makeJob({
      kind: "RENAME_WORK_FOLDER",
      payload: {
        kind: "RENAME_WORK_FOLDER",
        workId: "work-1",
        fromPath: "old/name",
        toPath: "new/name",
      },
    });
    queueSingleJob(job);
    mocks.workFindUnique.mockResolvedValue({ nextcloudFolderPath: null });

    await processPending();

    expect(mocks.moveFolder).not.toHaveBeenCalled();
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });

  it("DELETE_WORK_FOLDER con folderPath vacío → DONE sin borrar en el provider", async () => {
    const job = makeJob({
      kind: "DELETE_WORK_FOLDER",
      payload: { kind: "DELETE_WORK_FOLDER", folderPath: "" },
    });
    queueSingleJob(job);

    await processPending();

    expect(mocks.deleteFolder).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });

  it("CREATE_WORK_FOLDER con folderEnabledAt null → DONE sin crear carpeta en el provider", async () => {
    const job = makeJob({
      kind: "CREATE_WORK_FOLDER",
      payload: {
        kind: "CREATE_WORK_FOLDER",
        workId: "work-1",
        workName: "Proyecto",
        groupId: "group-1",
        ownerUserId: null,
      },
    });
    queueSingleJob(job);
    mocks.workFindUnique.mockResolvedValue({
      id: "work-1",
      folderSeq: 7,
      folderEnabledAt: null,
      nextcloudFolderPath: null,
    });

    await processPending();

    expect(mocks.createWorkFolder).not.toHaveBeenCalled();
    expect(mocks.workUpdate).not.toHaveBeenCalled();
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });
});

describe("processPending — ADD_MEMBER/REMOVE_MEMBER con dependencia YA resuelta y fallo real (R1)", () => {
  it("dependencia resuelta pero el provider falla de verdad → SÍ incrementa attempts", async () => {
    const job = makeJob({ attempts: 0 });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: "nc-group-1" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });
    mocks.addMember.mockRejectedValue(new Error("Network timeout"));

    await processPending();

    expect(mocks.addMember).toHaveBeenCalledWith({
      storageGroupId: "nc-group-1",
      storageUserId: "nc-user-1",
    });
    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.attempts).toBe(1);
    expect(data.status).toBe("PENDING");
    expect(data.lastError).toBe("Network timeout");
  });

  it("dependencia resuelta, fallo real agota el presupuesto de intentos → pasa a FAILED", async () => {
    const job = makeJob({ kind: "REMOVE_MEMBER", attempts: 9, payload: { kind: "REMOVE_MEMBER", groupId: "group-1", userId: "user-1" } });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: "nc-group-1" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });
    mocks.removeMember.mockRejectedValue(new Error("Network timeout"));

    await processPending();

    const [{ data }] = mocks.provisioningJobUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.attempts).toBe(10);
    expect(data.status).toBe("FAILED");
  });

  it("dependencia resuelta y la operación tiene éxito → DONE, sin tocar attempts en el resultado", async () => {
    const job = makeJob({ attempts: 3 });
    queueSingleJob(job);
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ id: "group-1", nextcloudGroupId: "nc-group-1" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: "user-1", nextcloudUserId: "nc-user-1" });
    mocks.addMember.mockResolvedValue(undefined);

    await processPending();

    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });
});

describe("processPending — carpetas bajo GENWORK_<EMPRESA> y archivado con datos", () => {
  it("CREATE_WORK_FOLDER de grupo: nombre NOMBRE_código y scope con el grupo de la nube", async () => {
    queueSingleJob(
      makeJob({
        kind: "CREATE_WORK_FOLDER",
        payload: {
          kind: "CREATE_WORK_FOLDER",
          workId: "work-1",
          workName: "Campaña otoño",
          groupId: "group-1",
          ownerUserId: null,
        },
      }),
    );
    mocks.workFindUnique.mockResolvedValue({ id: "work-1", folderSeq: 7, folderEnabledAt: NOW, groupId: "group-1", ownerId: null });
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ name: "Ventas", nextcloudGroupId: "gw-Ventas" });
    mocks.createWorkFolder.mockResolvedValue({ folderPath: "/GENWORK_GEN/VENTAS/CAMPAÑA-OTOÑO_007" });

    await processPending();

    expect(mocks.createWorkFolder).toHaveBeenCalledWith({
      scope: { groupName: "Ventas", storageGroupId: "gw-Ventas" },
      workName: "CAMPAÑA-OTOÑO_007",
    });
    expect(mocks.workUpdate).toHaveBeenCalledWith({
      where: { id: "work-1" },
      data: { nextcloudFolderPath: "/GENWORK_GEN/VENTAS/CAMPAÑA-OTOÑO_007" },
    });
  });

  it("CREATE_WORK_FOLDER personal: scope con el email del dueño", async () => {
    queueSingleJob(
      makeJob({
        kind: "CREATE_WORK_FOLDER",
        payload: {
          kind: "CREATE_WORK_FOLDER",
          workId: "work-1",
          workName: "Mi proyecto",
          groupId: null,
          ownerUserId: "user-1",
        },
      }),
    );
    mocks.workFindUnique.mockResolvedValue({ id: "work-1", folderSeq: 12, folderEnabledAt: NOW, groupId: null, ownerId: "user-1" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      email: "tomas@gen.net.ar",
      nextcloudUserId: "tomas@gen.net.ar",
    });
    mocks.createWorkFolder.mockResolvedValue({ folderPath: "/x" });

    await processPending();

    expect(mocks.createWorkFolder).toHaveBeenCalledWith({
      scope: { personalStorageUserId: "tomas@gen.net.ar", personalEmail: "tomas@gen.net.ar" },
      workName: "MI-PROYECTO_012",
    });
  });

  it("MOVE_WORK_FOLDER hacia _archivados: mueve, actualiza la ruta y escribe el snapshot", async () => {
    const toPath = "/GENWORK_GEN/_archivados/VENTAS/INFORME_007";
    queueSingleJob(
      makeJob({
        kind: "MOVE_WORK_FOLDER",
        payload: {
          kind: "MOVE_WORK_FOLDER",
          workId: "work-1",
          fromPath: "/GENWORK_GEN/VENTAS/INFORME_007",
          toPath,
        },
      }),
    );
    mocks.workFindUnique.mockResolvedValue({
      nextcloudFolderPath: "/GENWORK_GEN/VENTAS/INFORME_007",
      group: { name: "Ventas", nextcloudGroupId: "gw-Ventas" },
      owner: null,
    });
    const archived = { id: "work-1", name: "Informe" };
    mocks.loadArchivableWork.mockResolvedValue(archived);

    await processPending();

    expect(mocks.moveFolder).toHaveBeenCalledWith("/GENWORK_GEN/VENTAS/INFORME_007", toPath);
    expect(mocks.workUpdateMany).toHaveBeenCalledWith({
      where: { id: "work-1" },
      data: { nextcloudFolderPath: toPath },
    });
    expect(mocks.shareScopeFolder).toHaveBeenCalledWith({
      path: "/GENWORK_GEN/_archivados/VENTAS",
      scope: { groupName: "Ventas", storageGroupId: "gw-Ventas" },
    });
    expect(mocks.writeArchiveSnapshot).toHaveBeenCalledWith(expect.anything(), archived, toPath);
    expect(mocks.provisioningJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "DONE", lastError: null },
    });
  });

  it("MOVE/RENAME re-basa las rutas de los FileShare del proyecto", async () => {
    const from = "/GENWORK_GEN/VENTAS/INFORME_007";
    const to = "/GENWORK_GEN/VENTAS/REPORTE_007";
    queueSingleJob(
      makeJob({
        kind: "RENAME_WORK_FOLDER",
        payload: { kind: "RENAME_WORK_FOLDER", workId: "work-1", fromPath: from, toPath: to },
      }),
    );
    mocks.workFindUnique.mockResolvedValue({ nextcloudFolderPath: from, group: null, owner: null });
    mocks.fileShareFindMany.mockResolvedValue([
      { id: "s1", path: `${from}/a.pdf` },
      { id: "s2", path: `${from}/planos/b.pdf` },
    ]);

    await processPending();

    expect(mocks.fileShareUpdate).toHaveBeenCalledWith({ where: { id: "s1" }, data: { path: `${to}/a.pdf` } });
    expect(mocks.fileShareUpdate).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { path: `${to}/planos/b.pdf` },
    });
  });

  it("MOVE_WORK_FOLDER de desarchivado: no escribe snapshot", async () => {
    queueSingleJob(
      makeJob({
        kind: "MOVE_WORK_FOLDER",
        payload: {
          kind: "MOVE_WORK_FOLDER",
          workId: "work-1",
          fromPath: "/GENWORK_GEN/_archivados/VENTAS/INFORME_007",
          toPath: "/GENWORK_GEN/VENTAS/INFORME_007",
        },
      }),
    );
    mocks.workFindUnique.mockResolvedValue({
      nextcloudFolderPath: "/GENWORK_GEN/_archivados/VENTAS/INFORME_007",
    });

    await processPending();

    expect(mocks.moveFolder).toHaveBeenCalled();
    expect(mocks.shareScopeFolder).not.toHaveBeenCalled();
    expect(mocks.writeArchiveSnapshot).not.toHaveBeenCalled();
  });
});

describe("processPending — Google Drive (carpetas por ID)", () => {
  const archiveWorkFolder = vi.fn();
  const rename = vi.fn();

  beforeEach(() => {
    archiveWorkFolder.mockReset();
    rename.mockReset();
    mocks.getStorageProvider.mockResolvedValue({
      moveFolder: mocks.moveFolder,
      archiveWorkFolder,
      rename,
    });
    mocks.workFindUnique.mockResolvedValue({
      nextcloudFolderPath: "drive-folder-id",
      group: { name: "Ventas", nextcloudGroupId: "group-folder-id" },
      owner: null,
    });
  });

  it("archivar: mueve por ID a _archivados, deja el ID en la BD y escribe el snapshot en la carpeta", async () => {
    queueSingleJob(
      makeJob({
        kind: "MOVE_WORK_FOLDER",
        payload: {
          kind: "MOVE_WORK_FOLDER",
          workId: "work-1",
          fromPath: "drive-folder-id",
          toPath: "_archivados/drive-folder-id",
          direction: "archive",
        },
      }),
    );
    const archived = { id: "work-1", name: "Informe" };
    mocks.loadArchivableWork.mockResolvedValue(archived);

    await processPending();

    expect(archiveWorkFolder).toHaveBeenCalledWith({
      folderPath: "drive-folder-id",
      direction: "archive",
      scope: { groupName: "Ventas", storageGroupId: "group-folder-id" },
    });
    expect(mocks.moveFolder).not.toHaveBeenCalled();
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
    expect(mocks.writeArchiveSnapshot).toHaveBeenCalledWith(expect.anything(), archived, "drive-folder-id");
  });

  it("job viejo sin direction: la deduce de toPath", async () => {
    queueSingleJob(
      makeJob({
        kind: "MOVE_WORK_FOLDER",
        payload: {
          kind: "MOVE_WORK_FOLDER",
          workId: "work-1",
          fromPath: "drive-folder-id",
          toPath: "drive-folder-id",
        },
      }),
    );

    await processPending();

    expect(archiveWorkFolder).toHaveBeenCalledWith(expect.objectContaining({ direction: "unarchive" }));
    expect(mocks.writeArchiveSnapshot).not.toHaveBeenCalled();
  });

  it("renombrar: cambia el nombre de la carpeta por ID", async () => {
    queueSingleJob(
      makeJob({
        kind: "RENAME_WORK_FOLDER",
        payload: {
          kind: "RENAME_WORK_FOLDER",
          workId: "work-1",
          fromPath: "drive-folder-id",
          toPath: "REPORTE_007",
        },
      }),
    );

    await processPending();

    expect(rename).toHaveBeenCalledWith({ path: "drive-folder-id", newName: "REPORTE_007" });
    expect(mocks.moveFolder).not.toHaveBeenCalled();
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
  });
});

describe("processPending — RESCOPE_WORK_FOLDER (cambio de grupo del proyecto)", () => {
  const moveWorkFolderToScope = vi.fn();

  beforeEach(() => {
    moveWorkFolderToScope.mockReset();
    mocks.getStorageProvider.mockResolvedValue({ moveWorkFolderToScope });
    queueSingleJob(
      makeJob({ kind: "RESCOPE_WORK_FOLDER", payload: { kind: "RESCOPE_WORK_FOLDER", workId: "work-1" } }),
    );
  });

  it("mueve la carpeta al grupo actual del proyecto y actualiza ruta y links compartidos", async () => {
    mocks.workFindUnique.mockResolvedValue({
      groupId: "group-2",
      ownerId: null,
      nextcloudFolderPath: "/GENWORK_GEN/VENTAS/INFORME_007",
    });
    mocks.groupFindUniqueOrThrow.mockResolvedValue({ name: "Diseño", nextcloudGroupId: "gw-Diseño" });
    moveWorkFolderToScope.mockResolvedValue({ folderPath: "/GENWORK_GEN/DISEÑO/INFORME_007" });

    await processPending();

    expect(moveWorkFolderToScope).toHaveBeenCalledWith({
      folderPath: "/GENWORK_GEN/VENTAS/INFORME_007",
      scope: { groupName: "Diseño", storageGroupId: "gw-Diseño" },
    });
    expect(mocks.workUpdateMany).toHaveBeenCalledWith({
      where: { id: "work-1" },
      data: { nextcloudFolderPath: "/GENWORK_GEN/DISEÑO/INFORME_007" },
    });
    expect(mocks.fileShareFindMany).toHaveBeenCalled();
  });

  it("proveedor por ID (ruta igual): no toca la base", async () => {
    mocks.workFindUnique.mockResolvedValue({ groupId: null, ownerId: "user-1", nextcloudFolderPath: "drive-id" });
    mocks.userFindUniqueOrThrow.mockResolvedValue({ email: "t@gen.net.ar", nextcloudUserId: "t@gen.net.ar" });
    moveWorkFolderToScope.mockResolvedValue({ folderPath: "drive-id" });

    await processPending();

    expect(moveWorkFolderToScope).toHaveBeenCalledWith({
      folderPath: "drive-id",
      scope: { personalStorageUserId: "t@gen.net.ar", personalEmail: "t@gen.net.ar" },
    });
    expect(mocks.workUpdateMany).not.toHaveBeenCalled();
  });

  it("proyecto sin carpeta: nada que mover", async () => {
    mocks.workFindUnique.mockResolvedValue({ groupId: "group-2", ownerId: null, nextcloudFolderPath: null });

    await processPending();

    expect(moveWorkFolderToScope).not.toHaveBeenCalled();
  });
});
