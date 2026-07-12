import { describe, it, expect } from "vitest";
import { taskCreateInputShape, taskUpdateInputShape } from "@/lib/mcp/tools/tasks";
import { parseTags } from "@/lib/domain/tags/parser";

describe("task.create / task.update — passthrough de etiquetado inline (Principio II)", () => {
  it("task.create no define campos estructurados paralelos para / # @ $", () => {
    expect(Object.keys(taskCreateInputShape).sort()).toEqual(["text", "workId"]);
  });

  it("task.update no define campos estructurados paralelos para / # @ $", () => {
    expect(Object.keys(taskUpdateInputShape).sort()).toEqual(["taskId", "text"]);
  });

  it("el campo 'text' validado por el schema llega intacto al parser real de la web", () => {
    const raw = "Cortar chapa #Metalurgica @Ventas /Mueble living $urgente";
    const parsed = taskCreateInputShape.text.parse(raw);
    // El schema solo trimea/valida longitud; no toca ni resuelve los símbolos —
    // esa responsabilidad es exclusiva de parseTags (misma fuente que la web).
    expect(parsed).toBe(raw);
    const { tags } = parseTags(parsed);
    expect(tags.map((t) => t.symbol).sort()).toEqual(["#", "$", "/", "@"]);
  });
});
