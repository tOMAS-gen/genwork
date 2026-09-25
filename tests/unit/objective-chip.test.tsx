import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { groupMoveCandidates } from "@/components/tasks/TaskMoveDialog";

const inProgress = { id: "s1", name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS" as const };
const final = { id: "s2", name: "Hecha", color: "#16a34a", type: "FINAL" as const };
const objective = { id: "o1", title: "Eléctrica", position: 0 };

function task(over: Partial<TaskDto> & { id: string; displayText: string }): TaskDto {
  return {
    rawText: over.displayText,
    status: inProgress,
    statusOptions: [
      { ...inProgress, sortOrder: 0 },
      { ...final, sortOrder: 1 },
    ],
    workId: "w1",
    work: { id: "w1", name: "Casa Pérez" },
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
    objectiveId: "o1",
    objective,
    ...over,
  };
}

const render = (t: TaskDto, context: Parameters<typeof TaskItem>[0]["context"]) =>
  renderToString(<TaskItem task={t} context={context} canToggle onChanged={() => {}} />);

describe("chip de objetivo en TaskItem", () => {
  it("en la lista general del proyecto muestra el título y enlaza a la sección", () => {
    const html = render(task({ id: "t1", displayText: "Cablear" }), { workId: "w1", objectiveId: null });
    expect(html).toContain('class="tag tag-objective"');
    expect(html).toContain('href="/works/w1#objetivo-o1"');
    expect(html).toContain(">Eléctrica<");
  });

  it("dentro de la sección de su propio objetivo no aparece", () => {
    const html = render(task({ id: "t1", displayText: "Cablear" }), { workId: "w1", objectiveId: "o1" });
    expect(html).not.toContain("tag-objective");
  });

  it("sin objetivo no aparece", () => {
    const html = render(task({ id: "t1", displayText: "Cablear", objectiveId: null, objective: null }), {
      workId: "w1",
    });
    expect(html).not.toContain("tag-objective");
  });

  it("las hijas no repiten el chip del padre", () => {
    const parent = task({
      id: "p1",
      displayText: "Tablero",
      subtaskCount: 1,
      subtasks: [task({ id: "c1", displayText: "Hija", parentId: "p1" })],
    });
    const html = render(parent, { workId: "w1" });
    expect(html.match(/tag-objective"/g)?.length).toBe(1);
  });

  it("fuera del proyecto usa la forma 'Proyecto › Objetivo' si el proyecto no se ve en la fila", () => {
    const html = render(task({ id: "t1", displayText: "Cablear" }), { sectorId: "s9", suppressWorkTag: true });
    // El grupo del sector ya muestra el proyecto: solo el título.
    expect(html).toContain(">Eléctrica<");
    const loose = render(task({ id: "t1", displayText: "Cablear" }), {});
    expect(loose).toContain("Casa Pérez › Eléctrica");
  });

  it("el tablero del proyecto (plano) muestra el chip en la tarjeta", () => {
    const html = renderToString(
      <TaskBoardView
        tasks={[task({ id: "t1", displayText: "Cablear" })]}
        context={{ workId: "w1" }}
        canToggle
        onChanged={() => {}}
        objectiveOptions={[{ id: "o1", title: "Eléctrica" }]}
      />,
    );
    expect(html).toContain("tag-objective");
    expect(html).toContain('aria-label="Acciones de &quot;Cablear&quot;"');
  });
});

describe("TaskMoveDialog agrupa candidatas por objetivo", () => {
  const objectives = [
    { id: "o1", title: "Eléctrica" },
    { id: "o2", title: "Pintura" },
  ];
  const c = (id: string, objectiveId: string | null, parentId: string | null = null) => ({
    id,
    displayText: id,
    parentId,
    objectiveId,
  });

  it("generales + un grupo por objetivo, sin la propia tarea, sin hijas y sin grupos vacíos", () => {
    const groups = groupMoveCandidates(
      [c("g1", null), c("me", null), c("a1", "o1"), c("h1", "o1", "a1")],
      objectives,
      "me",
    );
    expect(groups.map((g) => [g.title, g.tasks.map((t) => t.id)])).toEqual([
      ["Tareas generales", ["g1"]],
      ["Eléctrica", ["a1"]],
    ]);
  });

  it("sin objetivos: un solo grupo sin título, como antes", () => {
    const groups = groupMoveCandidates([c("g1", null), c("g2", null)], [], "g2");
    expect(groups).toEqual([{ key: "all", title: null, tasks: [c("g1", null)] }]);
  });
});
