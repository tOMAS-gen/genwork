"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eye, Trash2 } from "@/components/ui/icons";

/**
 * Quiénes ven este proyecto desde el portal de cliente (feature 059, US1).
 *
 * Atajo desde el proyecto: agregar un cliente por su correo, sin buscador. Nace
 * con acceso a este proyecto y nada más. Para darle varios proyectos de una, o
 * para ver la foto completa de quién ve qué, está la sección "Clientes del grupo"
 * en la página del grupo.
 *
 * Visible solo para quien administra el ámbito del proyecto (ADMIN del grupo,
 * dueño del espacio personal o super-admin).
 */

interface GrantRow {
  userId: string;
  name: string;
  email: string;
  firstLoginAt: string | null;
  grantedAt: string;
  grantedByName: string | null;
}

export function ClientAccessPanel({
  workId,
  groupId,
}: {
  workId: string;
  groupId: string | null;
}) {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    void api<GrantRow[]>(`/api/works/${workId}/client-grants`)
      .then(setGrants)
      .catch((e: Error) => setStatus(e.message));
  };
  useEffect(load, [workId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await api(`/api/works/${workId}/client-grants`, {
        method: "POST",
        body: JSON.stringify({ email, name }),
      });
      setEmail("");
      setName("");
      load();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (userId: string) => {
    try {
      await api(`/api/works/${workId}/client-grants/${userId}`, { method: "DELETE" });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 620 }}>
      <p className="muted">
        Los clientes con acceso ven este proyecto, sus tareas y su avance en modo lectura. No
        pueden completar ni modificar nada.
        {groupId && (
          <>
            {" "}
            Para darle varios proyectos a la vez, usá{" "}
            <Link href={`/groups/${groupId}`}>Clientes del grupo</Link>.
          </>
        )}
      </p>

      <form onSubmit={add} className="card" style={{ display: "grid", gap: 8 }}>
        <strong>Agregar cliente a este proyecto</strong>
        <label>
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </label>
        <label>
          Nombre
          <input
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Agregando…" : "Agregar cliente"}
        </button>
      </form>

      {status && <p className="form-error">{status}</p>}

      {grants.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Ningún cliente ve este proyecto"
          description="Agregá uno con su correo para que pueda seguir el avance."
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {grants.map((g) => (
            <li key={g.userId} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{g.name}</strong>
                  <div className="muted">{g.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* El estado se nombra, no se comunica solo por color (Principio V). */}
                  <span
                    className="label-chip color-chip"
                    style={
                      {
                        "--c": g.firstLoginAt ? "var(--ok)" : "var(--muted)",
                      } as React.CSSProperties
                    }
                  >
                    {g.firstLoginAt ? "Activo" : "Invitado"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void revoke(g.userId)}
                    aria-label={`Quitar el acceso de ${g.name}`}
                    title="Quitar acceso"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
