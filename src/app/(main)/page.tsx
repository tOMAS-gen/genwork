"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { TaskItem, type TaskDto } from "@/components/tasks/TaskItem";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Plus } from "@/components/ui/icons";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";

interface WorkRow {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  _count: { tasks: number };
}

/** Home: lista de proyectos con botón + (FR-102) + "Mis referencias" (@usuario). */
export default function HomePage() {
  const [works, setWorks] = useState<WorkRow[]>([]);
  const [references, setReferences] = useState<TaskDto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    void api<WorkRow[]>("/api/works").then(setWorks).catch(() => {});
    void api<TaskDto[]>("/api/me/references?state=PENDING").then(setReferences).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Proyectos</h1>
        <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Nuevo proyecto
          </span>
        </button>
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />

      <div style={{ display: "grid", gap: 10, maxWidth: 640, marginTop: 16 }}>
        {works.map((w) => (
          <Link key={w.id} className="card" href={`/works/${w.id}`}>
            <strong>{w.name}</strong>
            {w.description && <div style={{ margin: "2px 0" }}>{w.description}</div>}
            <div className="muted">
              {w.group ? `Grupo ${w.group.name}` : "Personal"} · {w._count.tasks} tareas
            </div>
          </Link>
        ))}
        {works.length === 0 && (
          <p className="muted">Sin proyectos activos. Creá el primero con “Nuevo proyecto”.</p>
        )}
      </div>

      {references.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Mis referencias</h2>
          <p className="muted">Tareas de otros que necesitan tu aporte (@vos).</p>
          {references.map((task) => (
            <TaskItem key={task.id} task={task} context={{}} canToggle={false} onChanged={load} />
          ))}
        </>
      )}
    </div>
  );
}
