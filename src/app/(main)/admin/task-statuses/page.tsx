"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { TaskStatusSettings, type TaskStatusScope } from "@/components/admin/TaskStatusSettings";

interface GroupDto {
  id: string;
  name: string;
}

/**
 * Administración del conjunto general de estados de tarea (feature 042, US1):
 * el default de organización o personal. Cada sector puede adaptar el suyo
 * desde su propia página (ver sectors/[id]/page.tsx). Sigue el patrón visual
 * de /admin/stages (selector de ámbito grupo/personal).
 */
export default function TaskStatusesAdminPage() {
  usePageTitle("Estados de tarea");
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [groupId, setGroupId] = useState<string>("personal");
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [groupsData, me] = await Promise.all([
        api<GroupDto[]>("/api/groups"),
        api<{ id: string }>("/api/me"),
      ]);
      setGroups(groupsData);
      setMeId(me.id);
    })();
  }, []);

  const scope: TaskStatusScope | null =
    groupId === "personal" ? (meId ? { ownerId: meId } : null) : { groupId };

  return (
    <div>
      <h1>Estados de tarea</h1>
      <p className="muted">
        Conjunto general de estados: &ldquo;en curso&rdquo; (uno o más) y &ldquo;final&rdquo;
        (exactamente uno) por ámbito. Los sectores pueden adaptar el suyo propio desde su
        configuración.
      </p>

      <div className="dialog-field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label htmlFor="task-status-scope">Ámbito</label>
        <select
          id="task-status-scope"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="personal">Personal</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">{scope && <TaskStatusSettings scope={scope} title="" />}</div>
    </div>
  );
}
