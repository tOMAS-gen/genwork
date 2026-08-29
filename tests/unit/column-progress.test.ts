import { describe, it, expect } from "vitest";
import { columnProgress } from "@/components/board/columnProgress";

/**
 * 062-subtareas (hallazgo Importante 2 de revisión): antes, BoardGrid
 * calculaba el progreso de cada columna con `col.tasks.length` y un filtro
 * FINAL crudo, contando al padre Y a sus hijas — mientras `/api/sectors` ya
 * salteaba al padre. Misma columna, dos números distintos en pantalla.
 */

const task = (status: "IN_PROGRESS" | "FINAL", subtaskCount = 0) => ({
  status: { type: status },
  subtaskCount,
});

describe("columnProgress", () => {
  it("una tarjeta contenedora (subtaskCount > 0) no suma al total ni al done", () => {
    // 1 padre contenedor (abierto) + 1 hija propia (abierta) + 1 suelta (hecha)
    // = 2 pendientes en total, 1 hecha — el padre no debe sumar ni al total
    // ni al done aunque él mismo esté "abierto".
    const tasks = [task("IN_PROGRESS", 1), task("IN_PROGRESS"), task("FINAL")];
    expect(columnProgress(tasks)).toEqual({ done: 1, total: 2 });
  });

  it("sin ninguna tarjeta contenedora, cuenta todo tal cual (comportamiento viejo preservado)", () => {
    const tasks = [task("FINAL"), task("IN_PROGRESS"), task("FINAL")];
    expect(columnProgress(tasks)).toEqual({ done: 2, total: 3 });
  });

  it("columna vacía da total 0", () => {
    expect(columnProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("una columna con SOLO tarjetas contenedoras da total 0 (todas sus hijas viven en otro sector)", () => {
    const tasks = [task("IN_PROGRESS", 3), task("FINAL", 2)];
    expect(columnProgress(tasks)).toEqual({ done: 0, total: 0 });
  });
});
