/**
 * T006 [US2] — Migración masiva de nombres de carpeta a minúsculas (FR-007,
 * research.md R5).
 *
 * `migrateWorkFolderNames()` recorre los `Work` con `nextcloudFolderPath` no
 * nulo y encola un `RENAME_WORK_FOLDER` por cada uno cuyo último segmento de
 * ruta no esté ya en minúsculas, con el `toPath` recalculado vía
 * `computeRenamePath` (mismo `folderSeq`, mismo nombre, en minúsculas). Debe
 * ser idempotente (nada que migrar → no encola) y no duplicar jobs si ya hay
 * un `RENAME_WORK_FOLDER` `PENDING` para el mismo `workId`.
 *
 * Estrategia de mocking: se stubea `prisma` (vía `@/lib/db/client`) y
 * `enqueue` (vía `@/lib/storage/queue`), siguiendo el patrón de mocking ya
 * usado en `tests/unit/storage-queue.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workFindMany: vi.fn(),
  provisioningJobFindFirst: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findMany: (...args: unknown[]) => mocks.workFindMany(...args),
    },
    provisioningJob: {
      findFirst: (...args: unknown[]) => mocks.provisioningJobFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/storage/queue", () => ({
  enqueue: (...args: unknown[]) => mocks.enqueue(...args),
}));

const { migrateWorkFolderNames } = await import("@/lib/storage/folderNameMigration");

function work(overrides: Record<string, unknown> = {}) {
  return {
    id: "work-1",
    name: "Mueble Living",
    folderSeq: 23,
    nextcloudFolderPath: "/genwork/Cocina/023-Mueble Living",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.workFindMany.mockReset();
  mocks.provisioningJobFindFirst.mockReset();
  mocks.enqueue.mockReset();
  mocks.provisioningJobFindFirst.mockResolvedValue(null);
  mocks.enqueue.mockResolvedValue(undefined);
});

describe("migrateWorkFolderNames — FR-007 normalización a minúsculas", () => {
  it("encola RENAME para una carpeta con mayúsculas, con toPath en minúsculas", async () => {
    mocks.workFindMany.mockResolvedValue([work()]);

    await migrateWorkFolderNames();

    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith({
      kind: "RENAME_WORK_FOLDER",
      workId: "work-1",
      fromPath: "/genwork/Cocina/023-Mueble Living",
      toPath: "/genwork/Cocina/023-mueble living",
    });
  });

  it("es idempotente: no encola nada si la carpeta ya está en minúsculas", async () => {
    mocks.workFindMany.mockResolvedValue([
      work({ nextcloudFolderPath: "/genwork/Cocina/023-mueble living" }),
    ]);

    await migrateWorkFolderNames();

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("ignora los Work sin carpeta Nextcloud (findMany ya los filtra)", async () => {
    mocks.workFindMany.mockResolvedValue([]);

    await migrateWorkFolderNames();

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("no duplica: salta si ya hay un RENAME PENDING para el mismo workId", async () => {
    mocks.workFindMany.mockResolvedValue([work()]);
    mocks.provisioningJobFindFirst.mockResolvedValue({ id: "job-existente" });

    await migrateWorkFolderNames();

    expect(mocks.provisioningJobFindFirst).toHaveBeenCalledWith({
      where: {
        kind: "RENAME_WORK_FOLDER",
        status: "PENDING",
        payload: { path: ["workId"], equals: "work-1" },
      },
    });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("migra solo los desalineados en un lote mixto", async () => {
    mocks.workFindMany.mockResolvedValue([
      work({ id: "a", nextcloudFolderPath: "/genwork/G/000-uno" }),
      work({ id: "b", name: "Dos", folderSeq: 1, nextcloudFolderPath: "/genwork/G/001-DOS" }),
      work({ id: "c", name: "Tres", folderSeq: 2, nextcloudFolderPath: "/genwork/G/002-tres" }),
    ]);

    await migrateWorkFolderNames();

    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith({
      kind: "RENAME_WORK_FOLDER",
      workId: "b",
      fromPath: "/genwork/G/001-DOS",
      toPath: "/genwork/G/001-dos",
    });
  });
});
