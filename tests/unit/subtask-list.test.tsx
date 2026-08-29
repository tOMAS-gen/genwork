import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { subtaskProgressLabel, canFinishParent, parentBreadcrumb, reparentMenuLabel } from "@/components/tasks/SubtaskList";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";

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

  it("bloquea el check mientras queden hijas abiertas SIN sacarlo del tabulado (aria-disabled, no disabled nativo)", () => {
    // Revisión — hallazgo Importante 2: `disabled` nativo saca el control del
    // orden de Tab; acá tiene que seguir siendo alcanzable por teclado y
    // anunciar el motivo por aria-label (title es solo el tooltip visual).
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
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-label="Faltan 2 subtareas"');
    // ningún <input> de esta fila lleva el atributo `disabled` nativo (que sí
    // sacaría el checkbox del recorrido de Tab) — solo `aria-disabled`.
    expect(html).not.toMatch(/<input[^>]* disabled/);
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

    expect(html).toContain('aria-disabled="false"');
    expect(html).not.toMatch(/<input[^>]* disabled/);
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

  it("en modo solo lectura las hijas se listan planas, sin drag handle (mismo patrón que works/[id]/page.tsx)", () => {
    // Revisión — hallazgo Importante 1: `canToggle=false` (sector en modo vista,
    // proyecto no activo) no debe ofrecer un grip arrastrable — el backend lo
    // rechazaría con 403, pero el affordance ya es engañoso por sí solo.
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      canToggle: false,
      subtaskCount: 1,
      subtaskDone: 0,
      subtasks: [task({ id: "hija1", displayText: "Hija uno", parentId: "padre" })],
    });

    const html = renderToString(
      <TaskItem task={padre} context={{ workId: "w1" }} canToggle={false} onChanged={() => {}} />,
    );

    expect(html).toContain("Hija uno");
    expect(html).not.toContain("task-drag-handle");
    expect(html).not.toContain("Subtarea"); // tampoco el botón "+ Subtarea"
  });

  it("con permiso de edición, las hijas sí muestran el drag handle", () => {
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

    expect(html).toContain("task-drag-handle");
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

describe("migaja del tablero", () => {
  it("una subtarea muestra de qué tarea cuelga", () => {
    expect(parentBreadcrumb({ parentId: "p1", parentText: "Informe mensual" })).toBe("↳ Informe mensual");
  });

  it("una tarea raíz no muestra migaja", () => {
    expect(parentBreadcrumb({ parentId: null, parentText: null })).toBeNull();
  });
});

describe("reparentMenuLabel — texto del ítem de menú para mover/sacar (Tarea 13)", () => {
  it("una tarea raíz ofrece 'Mover bajo otra tarea…'", () => {
    expect(reparentMenuLabel({ parentId: null, parentText: null })).toBe("Mover bajo otra tarea…");
  });

  it("una subtarea ofrece 'Sacar de \"padre\"'", () => {
    expect(reparentMenuLabel({ parentId: "p1", parentText: "Informe mensual" })).toBe(
      'Sacar de "Informe mensual"',
    );
  });
});

/**
 * TaskBoardView — tarjetas propias para las subtareas (Tarea 13): el endpoint
 * anida las hijas bajo `subtasks` (mismo contrato que la lista), pero en el
 * tablero cada hija tiene que aparecer como tarjeta suelta en la columna de
 * SU PROPIO estado (no el del padre) — antes de esta tarea, una hija con
 * subtasks nested nunca se veía en el tablero. Mismo patrón renderToString
 * que el resto del archivo (sin jsdom).
 */
describe("TaskBoardView — subtareas como tarjetas propias (Tarea 13)", () => {
  it("una hija anidada bajo el padre aparece como tarjeta propia, con la migaja de su padre", () => {
    const padre = task({
      id: "padre",
      displayText: "Tarea padre",
      subtaskCount: 1,
      subtaskDone: 1,
      subtasks: [
        task({
          id: "hija1",
          displayText: "Hija uno",
          parentId: "padre",
          parentText: "Tarea padre",
          status: final,
        }),
      ],
    });

    const html = renderToString(
      <TaskBoardView tasks={[padre]} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).toContain("Hija uno");
    expect(html).toContain("↳ Tarea padre");
  });

  it("una tarea raíz sin padre no muestra migaja en su tarjeta", () => {
    const suelta = task({ id: "suelta", displayText: "Tarea suelta" });

    const html = renderToString(
      <TaskBoardView tasks={[suelta]} context={{ workId: "w1" }} canToggle={true} onChanged={() => {}} />,
    );

    expect(html).not.toContain("↳");
  });
});
