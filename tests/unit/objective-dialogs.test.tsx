import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { DeleteObjectiveDialog, deleteObjectiveCopy } from "@/components/objectives/DeleteObjectiveDialog";
import { EditObjectiveDialog } from "@/components/objectives/EditObjectiveDialog";
import { AddObjectiveDialog, templateCopyNotice } from "@/components/objectives/AddObjectiveDialog";
import { MoveToObjectiveDialog } from "@/components/objectives/MoveToObjectiveDialog";
import { buildObjectiveMenuItems } from "@/components/objectives/objectiveMenu";

const noop = () => {};
const asyncNoop = async () => {};

describe("DeleteObjectiveDialog", () => {
  it("con tareas ofrece las dos salidas", () => {
    const html = renderToString(
      <DeleteObjectiveDialog open onClose={noop} title="Pintura" taskCount={4} onConfirm={asyncNoop} />,
    );
    expect(html).toContain("Eliminar con sus 4 tareas");
    expect(html).toContain("Pasar tareas a generales");
    expect(html).toContain("Cancelar");
  });

  it("singular con una sola tarea", () => {
    expect(deleteObjectiveCopy("X", 1).deleteLabel).toBe("Eliminar con su tarea");
  });

  it("sin tareas solo 'Eliminar objetivo'", () => {
    const html = renderToString(
      <DeleteObjectiveDialog open onClose={noop} title="Vacío" taskCount={0} onConfirm={asyncNoop} />,
    );
    expect(html).toContain("Eliminar objetivo");
    expect(html).not.toContain("Pasar tareas a generales");
    expect(deleteObjectiveCopy("Vacío", 0).keepLabel).toBeNull();
  });
});

describe("EditObjectiveDialog", () => {
  it("precarga título y descripción", () => {
    const html = renderToString(
      <EditObjectiveDialog
        open
        onClose={noop}
        objective={{ title: "Pintura", description: "Interior" }}
        onSave={asyncNoop}
      />,
    );
    expect(html).toContain('value="Pintura"');
    expect(html).toContain("Interior");
    expect(html).toContain("Título del objetivo");
  });
});

describe("AddObjectiveDialog", () => {
  it("arranca en 'En blanco' con 'Crear objetivo'", () => {
    const html = renderToString(<AddObjectiveDialog open onClose={noop} workId="w1" onCreated={noop} />);
    expect(html).toContain("En blanco");
    expect(html).toContain("Desde plantilla");
    expect(html).toMatch(/aria-pressed="true"[^>]*>En blanco/);
    expect(html).toContain("Crear objetivo");
  });

  it("aviso de copia: plural, singular y vacío", () => {
    expect(templateCopyNotice(3)).toContain("Se copian 3 tareas pendientes");
    expect(templateCopyNotice(1)).toContain("Se copia 1 tarea pendiente");
    expect(templateCopyNotice(0)).toContain("queda vacío");
  });
});

describe("MoveToObjectiveDialog", () => {
  it("lista generales y objetivos, con la sección actual deshabilitada", () => {
    const html = renderToString(
      <MoveToObjectiveDialog
        open
        onClose={noop}
        task={{ id: "t1", displayText: "Cablear", objectiveId: "o1" }}
        objectives={[
          { id: "o1", title: "Eléctrica" },
          { id: "o2", title: "Pintura" },
        ]}
        onMoved={noop}
      />,
    );
    expect(html).toContain("Tareas generales");
    expect(html).toContain("Pintura");
    expect(html).toMatch(/disabled=""[^>]*aria-current="true"/);
  });
});

describe("menú ⋮ del objetivo", () => {
  const build = (isFirst: boolean, isLast: boolean) =>
    buildObjectiveMenuItems({
      isFirst,
      isLast,
      onEdit: noop,
      onMoveUp: noop,
      onMoveDown: noop,
      onSaveAsTemplate: noop,
      onDelete: noop,
    });

  it("tiene los ítems del plan en orden", () => {
    expect(build(false, false).map((i) => i.label)).toEqual([
      "Editar…",
      "Subir",
      "Bajar",
      "Guardar como plantilla",
      "Eliminar objetivo…",
    ]);
  });

  it("Subir deshabilitado en el primero y Bajar en el último", () => {
    const first = build(true, false);
    expect(first.find((i) => i.label === "Subir")?.disabled).toBe(true);
    expect(first.find((i) => i.label === "Bajar")?.disabled).toBe(false);
    const last = build(false, true);
    expect(last.find((i) => i.label === "Bajar")?.disabled).toBe(true);
    expect(last.find((i) => i.label === "Eliminar objetivo…")?.danger).toBe(true);
  });
});
