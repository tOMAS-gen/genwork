"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface Group {
  id: string;
  name: string;
  publicRead: boolean;
  _count: { sectors: number; works: number };
  memberships: { user: { email: string } }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = () => void api<Group[]>("/api/groups").then(setGroups).catch(() => {});
  useEffect(load, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await api("/api/groups", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setName("");
      setError("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h1>Grupos</h1>
      <div style={{ display: "flex", gap: 8, maxWidth: 480, marginBottom: 16 }}>
        <input
          placeholder="Nombre del grupo (ej.: Producción)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <button className="btn btn-primary" onClick={() => void create()}>
          Crear
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 620 }}>
        {groups.map((g) => (
          <Link key={g.id} className="card" href={`/groups/${g.id}`}>
            <strong>{g.name}</strong>{" "}
            {g.publicRead && <span className="tag tag-ref">lectura pública</span>}
            <div className="muted">
              {g.memberships.length} miembros · {g._count.sectors} sectores · {g._count.works}{" "}
              proyectos
            </div>
          </Link>
        ))}
        {groups.length === 0 && (
          <p className="muted">
            Sin grupos todavía. Lo que crees fuera de un grupo es personal: solo lo ves vos.
          </p>
        )}
      </div>
    </div>
  );
}
