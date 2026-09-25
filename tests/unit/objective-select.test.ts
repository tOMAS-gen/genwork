import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Prisma } from "@prisma/client";
import { describe, expect, expectTypeOf, it } from "vitest";
import { OBJECTIVE_REF_SELECT } from "@/lib/domain/objectives/select";

/**
 * objetivos: `OBJECTIVE_REF_SELECT` vive en un módulo hoja para que
 * `src/server/tasks.ts` lo pueda usar en su `taskInclude` sin formar un ciclo
 * con `src/server/taskDto.ts` (que importa `@/server/tasks`).
 */
const SELECT_PATH = fileURLToPath(new URL("../../src/lib/domain/objectives/select.ts", import.meta.url));

describe("OBJECTIVE_REF_SELECT", () => {
  it("elige solo id, título y posición del objetivo", () => {
    expect(OBJECTIVE_REF_SELECT).toStrictEqual({ select: { id: true, title: true, position: true } });
  });

  it("encaja en un include de Task y tipa `objective` como referencia nullable", () => {
    const include = { objective: OBJECTIVE_REF_SELECT } satisfies Prisma.TaskInclude;
    expect(include.objective).toBe(OBJECTIVE_REF_SELECT);
    type Row = Prisma.TaskGetPayload<{ include: typeof include }>;
    expectTypeOf<Row["objective"]>().toEqualTypeOf<{ id: string; title: string; position: number } | null>();
    expectTypeOf<Row["objectiveId"]>().toEqualTypeOf<string | null>();
  });

  it("es un módulo hoja: no importa ni reexporta nada", () => {
    const source = readFileSync(SELECT_PATH, "utf8");
    expect(source).not.toMatch(/^\s*import\b/m);
    expect(source).not.toMatch(/^\s*export\s+(\*|\{[^}]*\})\s+from\b/m);
    expect(source).not.toMatch(/\brequire\(/);
  });
});
