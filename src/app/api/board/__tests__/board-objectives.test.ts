import { describe, it, expect, beforeEach, vi } from "vitest";
import { objectiveBreadcrumb } from "@/lib/domain/objectives/breadcrumb";

/**
 * objetivos (vistas externas): GET /api/board (tablero global y TV) trae el
 * título del objetivo de cada tarjeta para la migaja "Proyecto › Objetivo".
 *
 * El mock de `taskLink.findMany` solo devuelve `objective` si la ruta lo pidió
 * en el include: contra la implementación vieja `objectiveTitle` no existe y
 * el test falla.
 */

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "user-1", email: "u@test.local", name: "Usuario", globalRole: "SUPERADMIN" },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: "user-1",
    globalRole: "SUPERADMIN",
    memberGroupIds: new Set<string>(),
    adminGroupIds: new Set<string>(),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

interface FakeTask {
  id: string;
  displayText: string;
  workId: string | null;
  parentId: string | null;
  parent: { id: string; displayText: string } | null;
  work: { name: string } | null;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  _count: { subtasks: number };
  objective: { id: string; title: string; position: number } | null;
}

const db = vi.hoisted(() => ({ tasks: [] as FakeTask[] }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sector: {
      findMany: vi.fn(async () => [
        { id: "sector-1", name: "Ventas", color: "#000", groupId: null, ownerId: null, group: null },
      ]),
    },
    taskLink: {
      findMany: vi.fn(
        async ({ include }: { include: { task: { include: { objective?: unknown } } } }) => {
          const wantsObjective = !!include.task.include.objective;
          return db.tasks.map((t) => {
            const { objective, ...rest } = t;
            return { task: wantsObjective ? { ...rest, objective } : rest };
          });
        },
      ),
    },
    workLabel: { findMany: vi.fn(async () => []) },
    task: { findMany: vi.fn(async () => []) },
  },
}));

import { GET } from "@/app/api/board/route";

const PENDIENTE = { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };

function task(over: Partial<FakeTask> & { id: string }): FakeTask {
  return {
    displayText: over.id,
    workId: "work-1",
    parentId: null,
    parent: null,
    work: { name: "Casa Pérez" },
    status: PENDIENTE,
    _count: { subtasks: 0 },
    objective: null,
    ...over,
  };
}

async function load() {
  const res = await GET(new Request("http://localhost/api/board"), undefined as never);
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    tasks: { id: string; workName: string | null; objectiveTitle: string | null }[];
  }[];
  return body[0].tasks;
}

describe("GET /api/board — objetivo de cada tarjeta (objetivos)", () => {
  beforeEach(() => {
    db.tasks = [
      task({ id: "de-objetivo", objective: { id: "o1", title: "Diseño", position: 0 } }),
      task({ id: "general" }),
      task({ id: "suelta", workId: null, work: null }),
      // Una hija lleva el objetivo de su raíz (D14): su tarjeta también lo muestra.
      task({
        id: "hija",
        parentId: "padre",
        parent: { id: "padre", displayText: "Padre" },
        objective: { id: "o1", title: "Diseño", position: 0 },
      }),
    ];
  });

  it("trae `objectiveTitle` en las tareas de un objetivo", async () => {
    const tasks = await load();
    expect(tasks.find((t) => t.id === "de-objetivo")?.objectiveTitle).toBe("Diseño");
    expect(tasks.find((t) => t.id === "hija")?.objectiveTitle).toBe("Diseño");
  });

  it("`objectiveTitle` es null en las generales y en las sueltas", async () => {
    const tasks = await load();
    expect(tasks.find((t) => t.id === "general")?.objectiveTitle).toBeNull();
    expect(tasks.find((t) => t.id === "suelta")?.objectiveTitle).toBeNull();
  });

  it("no expone el objeto `objective` crudo, solo el título", async () => {
    const tasks = await load();
    for (const t of tasks) expect(Object.keys(t)).not.toContain("objective");
  });

  it("la migaja que arma BoardGrid con esos datos dice 'Proyecto › Objetivo'", async () => {
    const tasks = await load();
    const crumb = (id: string) => {
      const t = tasks.find((x) => x.id === id)!;
      return objectiveBreadcrumb(t.workName, t.objectiveTitle);
    };
    expect(crumb("de-objetivo")).toBe("Casa Pérez › Diseño");
    expect(crumb("general")).toBe("Casa Pérez");
    expect(crumb("suelta")).toBe("Sin proyecto");
  });
});
