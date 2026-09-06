"use client";

import { LayoutGrid, List } from "@/components/ui/icons";
import styles from "./TaskViewToggle.module.css";

type TaskView = "list" | "board";

export function TaskViewToggle({
  value,
  onChange,
}: {
  value: TaskView;
  onChange: (value: TaskView) => void;
}) {
  return (
    <div className={styles.toggle} role="group" aria-label="Vista de tareas">
      <button type="button" aria-pressed={value === "list"} onClick={() => onChange("list")}>
        <List size={18} aria-hidden="true" />
        <span>Lista</span>
      </button>
      <button type="button" aria-pressed={value === "board"} onClick={() => onChange("board")}>
        <LayoutGrid size={18} aria-hidden="true" />
        <span>Tablero</span>
      </button>
    </div>
  );
}
