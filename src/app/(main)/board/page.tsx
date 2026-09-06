"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { BoardGrid } from "@/components/board/BoardGrid";
import { usePageTitle } from "@/lib/usePageTitle";

export default function BoardPage() {
  usePageTitle("Vista de tareas");
  return (
    <div className="sheet">
      <PageHeader title="Vista de tareas" description="Avance y pendientes de cada sector." icon="board" />
      <BoardGrid compact />
    </div>
  );
}
