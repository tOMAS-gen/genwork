import { describe, expect, it, vi } from "vitest";

/**
 * objetivos (crítica B7): smoke test de import en frío de
 * `works/[id]/route.ts`.
 *
 * La ruta carga `@/server/taskDto` antes que `@/server/tasks`, y `taskDto`
 * importa `tasks`. Si una constante que `tasks.ts` usa a nivel de módulo
 * (`OBJECTIVE_REF_SELECT` en su `taskInclude`) viviera en `taskDto.ts`, la
 * evaluación daría `ReferenceError: Cannot access before initialization`.
 * Por eso acá NO se mockean `taskDto`, `tasks` ni `objectives/select`: solo
 * `@/server/auth` (next-auth no resuelve en el entorno node de Vitest). El
 * cliente de Prisma real se construye sin conectar (es perezoso).
 */

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => {
    throw Object.assign(new Error("sin sesión"), { status: 401 });
  }),
}));

describe("import en frío de works/[id]/route.ts (crítica B7)", () => {
  it("carga sin ciclo de imports y los includes quedan inicializados", async () => {
    // La ruta PRIMERO, como la carga Next: es el orden que dispara el ciclo.
    const route = await import("@/app/api/works/[id]/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PATCH).toBe("function");
    expect(typeof route.DELETE).toBe("function");

    const { OBJECTIVE_REF_SELECT } = await import("@/lib/domain/objectives/select");
    const taskDto = await import("@/server/taskDto");
    expect(OBJECTIVE_REF_SELECT).toBeDefined();
    expect(taskDto.taskWithParentInclude.objective).toBe(OBJECTIVE_REF_SELECT);
    expect(taskDto.rootTaskWithSubtasksInclude.subtasks.include.objective).toBe(OBJECTIVE_REF_SELECT);

    const tasks = await import("@/server/tasks");
    expect(typeof tasks.getTaskOrThrow).toBe("function");
  });

  it("también cargan en frío las rutas nuevas de objetivos (importan tasks + works + objectives)", async () => {
    const mods = await Promise.all([
      import("@/app/api/works/[id]/objectives/route"),
      import("@/app/api/works/[id]/objectives/from-template/route"),
      import("@/app/api/works/[id]/objectives/reorder/route"),
      import("@/app/api/objectives/[id]/route"),
      import("@/app/api/objectives/[id]/save-as-template/route"),
      import("@/app/api/templates/route"),
      import("@/app/api/tasks/[id]/route"),
    ]);
    for (const m of mods) expect(Object.keys(m).length).toBeGreaterThan(0);
  });

  it("sin sesión la ruta responde 401 (el handler quedó armado de verdad)", async () => {
    const { GET } = await import("@/app/api/works/[id]/route");
    const res = await GET(new Request("http://localhost/api/works/x"), { params: Promise.resolve({ id: "x" }) });
    expect(res.status).toBe(401);
  });
});
