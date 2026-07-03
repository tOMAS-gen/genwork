"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";

interface SectorRow {
  id: string;
  name: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  _count: { taskLinks: number };
}

interface GroupRow {
  id: string;
  name: string;
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    void api<SectorRow[]>("/api/sectors").then(setSectors).catch(() => {});
    void api<GroupRow[]>("/api/groups").then(setGroups).catch(() => {});
  };
  useEffect(load, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await api("/api/sectors", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), groupId: groupId || null }),
      });
      setName("");
      setError("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h1>Sectores</h1>
      <div style={{ display: "flex", gap: 8, maxWidth: 640, marginBottom: 16 }}>
        <input
          placeholder="Nuevo sector (ej.: Metalúrgica, Compras)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ width: 200 }}>
          <option value="">Personal (solo yo)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Grupo {g.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => void create()}>
          Crear
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        {sectors.map((s) => (
          <Link key={s.id} className="card" href={`/sectors/${s.id}`}>
            <strong>#{s.name}</strong>
            <div className="muted">
              {s.group ? `Grupo ${s.group.name}` : "Personal"} · {s._count.taskLinks} tareas
            </div>
          </Link>
        ))}
        {sectors.length === 0 && <p className="muted">Sin sectores todavía.</p>}
      </div>
    </div>
  );
}
