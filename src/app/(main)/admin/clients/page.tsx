"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Trash2 } from "@/components/ui/icons";

/**
 * Alta y baja de clientes externos (feature 059, US1).
 *
 * Acá se administra la persona; qué proyectos ve se asigna desde cada proyecto
 * (pestaña "Acceso cliente"), que es donde vive la intención. Este panel también
 * muestra el resumen global de quién ve qué, que desde un proyecto suelto no se ve.
 */

interface ClientRow {
  id: string;
  email: string;
  name: string;
  firstLoginAt: string | null;
  createdAt: string;
  works: { id: string; name: string; status: string; grantedAt: string }[];
}

export default function ClientsAdminPage() {
  usePageTitle("Clientes");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    void api<ClientRow[]>("/api/admin/clients")
      .then(setClients)
      .catch((e: Error) => setStatus(e.message));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await api("/api/admin/clients", {
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

  const remove = async (client: ClientRow) => {
    const ok = await showConfirm(
      `${client.name} (${client.email}) va a perder el acceso a todos sus proyectos. No se borra ningún dato del proyecto.`,
      { title: "Dar de baja al cliente", confirmLabel: "Dar de baja", danger: true },
    );
    if (!ok) return;
    try {
      await api(`/api/admin/clients/${client.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Clientes</h1>
      <p className="muted">
        Un cliente entra con su correo y solo ve los proyectos que le asignes, sin poder modificar
        nada. Los proyectos se asignan desde la pestaña &quot;Acceso cliente&quot; de cada proyecto.
      </p>

      <form onSubmit={create} className="card" style={{ display: "grid", gap: 8 }}>
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
          {saving ? "Dando de alta…" : "Dar de alta"}
        </button>
      </form>

      {status && <p className="form-error">{status}</p>}

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {clients.length === 0 && <p className="muted">Todavía no hay clientes dados de alta.</p>}
        {clients.map((c) => (
          <div key={c.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <strong>{c.name}</strong>
                <div className="muted">{c.email}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* El estado se nombra, no se comunica solo por color (Principio V). */}
                <span
                  className="label-chip color-chip"
                  style={
                    {
                      "--c": c.firstLoginAt ? "var(--ok)" : "var(--muted)",
                    } as React.CSSProperties
                  }
                >
                  {c.firstLoginAt ? "Activo" : "Invitado"}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void remove(c)}
                  aria-label={`Dar de baja a ${c.name}`}
                  title="Dar de baja"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {c.works.length === 0
                ? "Sin proyectos asignados"
                : `Proyectos: ${c.works.map((w) => w.name).join(", ")}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
