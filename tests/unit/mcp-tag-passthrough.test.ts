import { describe, it, expect } from "vitest";
import { taskCreateInputShape, taskUpdateInputShape } from "@/lib/mcp/tools/tasks";
import { parseTags } from "@/lib/domain/tags/parser";

describe("task.create / task.update — passthrough de etiquetado inline (Principio II)", () => {
  it("task.create no define campos estructurados paralelos para / # @ $", () => {
    // 062-subtareas: parentId no es un símbolo de etiquetado inline (no hay
    // "#parentId" en el texto) — es la posición estructural de la tarea nueva
    // como hija de otra, mismo rol que el `parentId` de saveTask (Tarea 7).
    expect(Object.keys(taskCreateInputShape).sort()).toEqual(["parentId", "text", "workId"]);
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
