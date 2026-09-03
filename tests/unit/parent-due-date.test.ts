import { describe, expect, it } from "vitest";
import { effectiveDueDate } from "@/lib/domain/tasks/parentDueDate";

const d = (iso: string) => new Date(iso);

describe("effectiveDueDate", () => {
  it("usa la fecha propia cuando existe", () => {
    const r = effectiveDueDate({
      dueDate: d("2026-09-10"),
      subtasks: [{ dueDate: d("2026-09-01"), status: { type: "IN_PROGRESS" } }],
    });
    expect(r).toEqual({ date: d("2026-09-10"), inherited: false });
  });

  it("sin fecha propia toma la más próxima de las hijas abiertas", () => {
    const r = effectiveDueDate({
      dueDate: null,
      subtasks: [
        { dueDate: d("2026-09-15"), status: { type: "IN_PROGRESS" } },
        { dueDate: d("2026-09-12"), status: { type: "IN_PROGRESS" } },
      ],
    });
    expect(r).toEqual({ date: d("2026-09-12"), inherited: true });
  });

  it("ignora las fechas de hijas ya finalizadas", () => {
    const r = effectiveDueDate({
      dueDate: null,
      subtasks: [
        { dueDate: d("2026-09-01"), status: { type: "FINAL" } },
        { dueDate: d("2026-09-20"), status: { type: "IN_PROGRESS" } },
      ],
    });
    expect(r).toEqual({ date: d("2026-09-20"), inherited: true });
  });

  it("devuelve null si no hay ninguna fecha", () => {
    expect(effectiveDueDate({ dueDate: null, subtasks: [] })).toBeNull();
    expect(
      effectiveDueDate({ dueDate: null, subtasks: [{ dueDate: null, status: { type: "IN_PROGRESS" } }] }),
    ).toBeNull();
  });
});
