import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { subtaskProgressLabel, canFinishParent } from "@/components/tasks/SubtaskList";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";

describe("progreso de subtareas", () => {
  it("muestra hechas sobre total", () => {
    expect(subtaskProgressLabel({ subtaskDone: 1, subtaskCount: 3 })).toBe("1/3");
  });

  it("sin subtareas no muestra progreso", () => {
    expect(subtaskProgressLabel({ subtaskDone: 0, subtaskCount: 0 })).toBeNull();
  });

  it("el padre sólo se puede finalizar sin hijas abiertas", () => {
    expect(canFinishParent({ subtaskDone: 3, subtaskCount: 3 })).toBe(true);
    expect(canFinishParent({ subtaskDone: 2, subtaskCount: 3 })).toBe(false);
    expect(canFinishParent({ subtaskDone: 0, subtaskCount: 0 })).toBe(true);
  });
});

/**
 * Integración TaskItem + SubtaskList (Tarea 12): renderToString, mismo patrón
 * que tests/unit/portal-task-item-subtasks.test.tsx (sin @testing-library/react
 * — el proyecto corre los tests con environment "node", no jsdom).
 */
const inProgress = { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };
const final = { id: "s2", name: "Hecha", color: "#16a34a", type: "FINAL" as const };

function task(over: Partial<TaskDto> & { id: string; displayText: string }): TaskDto {
  return {
    rawText: over.displayText,
    status: inProgress,
    statusOptions: [
      { ...inProgress, sortOrder: 0 },
      { ...final, sortOrder: 1 },
    ],
    workId: "w1",
    work: { id: "w1", name: "Proyecto" },
    originType: "WORK",
    adoptedAt: null,
    homeSector: null,
    labels: [],
    links: [],
    description: null,
    canToggle: true,
    parentId: null,
    subtaskCount: 0,
    subtaskDone: 0,
    subtasks: [],
    ...over,
  };
}

describe("TaskItem — render de una tarea contenedora (Tarea 12)", () => {
  it("pinta el progreso GLOBAL del DTO junto al título, no el largo del array local", () => {
    // subtasks trae solo 1 hija (p. ej. una vista paginada), pero subtaskCount/
    // subtaskDone dicen 1/3: el badge tiene que mostrar el total real, "1/3".
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      subtaskCount: 3,
      subtaskDone: 1,
      subtasks: [task({ id: "hija1", displayText: "Hija uno", parentId: "padre" })],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).toContain("1/3");
    expect(html).toContain("Hija uno");
  });

  it("deshabilita el check mientras queden hijas abiertas, con el tooltip exacto", () => {
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      subtaskCount: 3,
      subtaskDone: 1,
      subtasks: [task({ id: "hija1", displayText: "Hija uno", parentId: "padre" })],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).toContain("Faltan 2 subtareas");
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled/);
  });

  it("habilita el check cuando ya no quedan hijas abiertas", () => {
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      subtaskCount: 2,
      subtaskDone: 2,
      subtasks: [
        task({ id: "hija1", displayText: "Hija uno", parentId: "padre", status: final }),
        task({ id: "hija2", displayText: "Hija dos", parentId: "padre", status: final }),
      ],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).not.toMatch(/<input[^>]*type="checkbox"[^>]*disabled/);
  });

  it("una hija no vuelve a ofrecer su propia lista de subtareas (un solo nivel)", () => {
    // Si TaskItem no filtrara por parentId, cada hija (variant "list" por
    // default) mostraría su propio botón "+ Subtarea" — pero el backend
    // rechaza una subtarea de una subtarea (SUBTASK_DEPTH), así que la UI no
    // tiene que ofrecerlo: debe aparecer un solo ".subtask-list" (el del padre).
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      subtaskCount: 1,
      subtaskDone: 0,
      subtasks: [task({ id: "hija1", displayText: "Hija uno", parentId: "padre" })],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html.match(/class="subtask-list"/g)?.length ?? 0).toBe(1);
  });

  it("una tarea sin hijas no renderiza la lista anidada si no se puede editar", () => {
    const suelta = task({ id: "suelta", displayText: "Tarea suelta" });

    const html = renderToString(
      <TaskItem task={suelta} context={{ workId: "w1" }} canToggle={false} onChanged={() => {}} />,
    );

    expect(html).not.toContain("subtask-list");
  });

  it("muestra el vencimiento heredado de una hija abierta, distinguido de una fecha propia", () => {
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      dueDate: null,
      subtaskCount: 1,
      subtaskDone: 0,
      subtasks: [
        task({ id: "hija1", displayText: "Hija uno", parentId: "padre", dueDate: "2026-09-01T00:00:00.000Z" }),
      ],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).toContain("date-chip-inherited");
    expect(html).toContain("Vence por una subtarea");
  });

  it("con fecha propia no muestra el badge de heredada", () => {
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      dueDate: "2026-08-30T00:00:00.000Z",
      subtaskCount: 1,
      subtaskDone: 0,
      subtasks: [
        task({ id: "hija1", displayText: "Hija uno", parentId: "padre", dueDate: "2026-09-01T00:00:00.000Z" }),
      ],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).not.toContain("date-chip-inherited");
  });
});
