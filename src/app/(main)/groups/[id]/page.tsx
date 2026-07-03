"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface Membership {
  role: "ADMIN" | "MEMBER";
  user: { id: string; email: string; name: string };
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  publicRead: boolean;
  memberships: Membership[];
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = useState<Group | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [status, setStatus] = useState("");

  const load = () =>
    void api<Group[]>("/api/groups")
      .then((gs) => setGroup(gs.find((g) => g.id === id) ?? null))
      .catch(() => {});
  useEffect(load, [id]);

  if (!group) return <p className="muted">Cargando…</p>;

  const addMember = async () => {
    try {
      await api(`/api/groups/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      setStatus("");
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await api(`/api/groups/${id}/members/${userId}`, { method: "DELETE" });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const togglePublicRead = async () => {
    try {
      await api(`/api/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ publicRead: !group.publicRead }),
      });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <h1>{group.name}</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={group.publicRead}
            onChange={() => void togglePublicRead()}
            style={{ width: "auto" }}
          />
          Lectura para no miembros (ej.: visible en el televisor)
        </label>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Desactivada: solo los miembros ven este grupo.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Miembros</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            placeholder="correo@google.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
            style={{ width: 140 }}
          >
            <option value="MEMBER">Miembro</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <button className="btn btn-primary" onClick={() => void addMember()}>
            Agregar
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {group.memberships.map((m) => (
            <li
              key={m.user.id}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
            >
              <span>
                {m.user.name} <span className="muted">({m.user.email})</span>{" "}
                {m.user.id === group.ownerId ? (
                  <span className="tag tag-work">admin principal</span>
                ) : (
                  m.role === "ADMIN" && <span className="tag tag-exec">admin</span>
                )}
              </span>
              {m.user.id !== group.ownerId && (
                <button className="btn" onClick={() => void removeMember(m.user.id)}>
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="muted">
          El administrador principal creó el grupo y no puede ser quitado. La carpeta compartida
          del grupo se crea sola en la mini nube.
        </p>
      </div>
      {status && <p style={{ color: "var(--danger)" }}>{status}</p>}
    </div>
  );
}
