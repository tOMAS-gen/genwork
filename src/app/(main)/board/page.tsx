"use client";

import { BoardGrid } from "@/components/board/BoardGrid";
import { usePageTitle } from "@/lib/usePageTitle";

export default function BoardPage() {
  usePageTitle("Vista de tareas");
  return (
    <div>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 var(--space-4)" }}>Vista de tareas</h1>
      <BoardGrid />
    </div>
  );
}
