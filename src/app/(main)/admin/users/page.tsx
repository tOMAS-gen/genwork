"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

interface UserRow {
  id: string;
  email: string;
  name: string;
  globalRole: "SUPERADMIN" | "MEMBER" | "READER";
  readerGrants: { group: { id: string; name: string } }[];
}

interface GroupRow {
  id: string;
  name: string;
}

/** Roles: cuenta Lector para pantallas/TV + grupos habilitados (FR-025, US6). */
export default function UsersAdminPage() {
  usePageTitle("Usuarios");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [status, setStatus] = useState("");

  const load = () => {
    void api<UserRow[]>("/api/admin/users").then(setUsers).catch(() => {});
    void api<GroupRow[]>("/api/groups").then(setGroups).catch(() => {});
  };
  useEffect(load, []);

  const setRole = async (userId: string, globalRole: "MEMBER" | "READER") => {
    try {
      await api("/api/admin/users", { method: "PUT", body: JSON.stringify({ userId, globalRole }) });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const toggleGrant = async (userId: string, groupId: string, enabled: boolean) => {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ userId, groupId, enabled }),
    });
    load();
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Usuarios y roles</h1>
      <p className="muted">
        El rol Lector es para pantallas de visualización (ej.: el correo del televisor): ve el
        dashboard y nunca puede modificar nada.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {users.map((u) => (
          <div key={u.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                <strong>{u.name}</strong> <span className="muted">({u.email})</span>
              </span>
              {u.globalRole === "SUPERADMIN" ? (
                <span className="tag tag-work">super-admin</span>
              ) : (
                <select
                  value={u.globalRole}
                  onChange={(e) => void setRole(u.id, e.target.value as "MEMBER" | "READER")}
                  style={{ width: 160 }}
                >
                  <option value="MEMBER">Miembro</option>
                  <option value="READER">Lector (TV)</option>
                </select>
              )}
            </div>
            {u.globalRole === "READER" && (
              <div style={{ marginTop: 8 }}>
                <span className="muted">Grupos habilitados (además de los de lectura pública):</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  {groups.map((g) => {
                    const enabled = u.readerGrants.some((r) => r.group.id === g.id);
                    return (
                      <label key={g.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => void toggleGrant(u.id, g.id, !enabled)}
                          style={{ width: "auto" }}
                        />
                        {g.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {status && <p style={{ color: "var(--danger)" }}>{status}</p>}
    </div>
  );
}
