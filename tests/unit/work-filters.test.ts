import type { Prisma } from "@prisma/client";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

/**
 * objetivos (higiene de plantillas): forma EXACTA de los filtros compartidos.
 *
 * Los mocks de varios contract tests (sectors-pending, groups-pending,
 * group-clients, works-pending, portal-works) leen `where.task.work.isTemplate`
 * o comparan el `where` completo: si una constante cambia de forma, esos tests
 * dejan de ver el filtro. Este archivo fija la forma de cada una.
 */

// `workFilters.ts` promete no cargar el cliente de prisma en runtime (solo
// `import type`). Si alguien lo cambia a un import de valor, este mock hace
// fallar la importación del módulo.
vi.mock("@prisma/client", () => {
  throw new Error("workFilters.ts no debe importar @prisma/client en runtime");
});

import {
  ACTIVE_PROJECT_WORK,
  ACTIVE_TEMPLATE_WORK,
  NOT_TEMPLATE_WORK,
  TASK_IN_ACTIVE_PROJECT_OR_LOOSE,
  TASK_NOT_IN_TEMPLATE,
} from "@/server/workFilters";

describe("workFilters — filtros de proyecto", () => {
  it("NOT_TEMPLATE_WORK: cualquier estado, solo excluye plantillas", () => {
    expect(NOT_TEMPLATE_WORK).toStrictEqual({ isTemplate: false });
  });

  it("ACTIVE_PROJECT_WORK: activo y no plantilla", () => {
    expect(ACTIVE_PROJECT_WORK).toStrictEqual({ status: "ACTIVE", isTemplate: false });
  });

  it("ACTIVE_TEMPLATE_WORK: plantilla activa", () => {
    expect(ACTIVE_TEMPLATE_WORK).toStrictEqual({ status: "ACTIVE", isTemplate: true });
  });

  it("conservan el tipo literal (satisfies, no anotación) y combinan con otros campos", () => {
    expectTypeOf(ACTIVE_PROJECT_WORK.status).toEqualTypeOf<"ACTIVE">();
    expectTypeOf(ACTIVE_TEMPLATE_WORK.isTemplate).toEqualTypeOf<true>();
    expectTypeOf(NOT_TEMPLATE_WORK.isTemplate).toEqualTypeOf<false>();

    // Mismo uso que `GET /api/works` (?filter=templates y listado normal).
    const groupId = "g-1";
    const templates: Prisma.WorkWhereInput = { ...ACTIVE_TEMPLATE_WORK, groupId };
    const projects: Prisma.WorkWhereInput = { ...NOT_TEMPLATE_WORK, status: "ARCHIVED", groupId };
    expect(templates).toStrictEqual({ status: "ACTIVE", isTemplate: true, groupId });
    expect(projects).toStrictEqual({ isTemplate: false, status: "ARCHIVED", groupId });
  });
});

describe("workFilters — filtros de tarea", () => {
  it("TASK_IN_ACTIVE_PROJECT_OR_LOOSE: proyecto activo no plantilla, o suelta", () => {
    expect(TASK_IN_ACTIVE_PROJECT_OR_LOOSE).toStrictEqual({
      OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }],
    });
  });

  it("TASK_NOT_IN_TEMPLATE: proyecto en cualquier estado (no plantilla), o suelta", () => {
    expect(TASK_NOT_IN_TEMPLATE).toStrictEqual({
      OR: [{ work: { isTemplate: false } }, { workId: null }],
    });
  });

  it("reusan las constantes de proyecto (una sola definición)", () => {
    const [activeBranch] = TASK_IN_ACTIVE_PROJECT_OR_LOOSE.OR as Prisma.TaskWhereInput[];
    const [notTemplateBranch] = TASK_NOT_IN_TEMPLATE.OR as Prisma.TaskWhereInput[];
    expect(activeBranch.work).toBe(ACTIVE_PROJECT_WORK);
    expect(notTemplateBranch.work).toBe(NOT_TEMPLATE_WORK);
  });

  it("esparcidos junto a `labels` dan el mismo where que el literal de la vista de sector", () => {
    const labelWhere = { labels: { some: { valueId: "v-1" } } } satisfies Prisma.TaskWhereInput;
    const task: Prisma.TaskWhereInput = { ...TASK_IN_ACTIVE_PROJECT_OR_LOOSE, ...labelWhere };
    expect(task).toStrictEqual({
      OR: [{ work: { status: "ACTIVE", isTemplate: false } }, { workId: null }],
      labels: { some: { valueId: "v-1" } },
    });
  });

  it("con otro OR en el mismo where se combinan con AND sin pisarse", () => {
    const other: Prisma.TaskWhereInput = { OR: [{ sectorId: "s-1" }, { sectorId: null }] };
    const where: Prisma.TaskWhereInput = { AND: [TASK_NOT_IN_TEMPLATE, other] };
    expect(where.AND).toStrictEqual([
      { OR: [{ work: { isTemplate: false } }, { workId: null }] },
      { OR: [{ sectorId: "s-1" }, { sectorId: null }] },
    ]);
  });
});
