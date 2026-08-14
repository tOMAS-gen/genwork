"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Trash2 } from "@/components/ui/icons";

/**
 * Clientes externos del grupo (feature 059, US1).
 *
 * El administrador agrega al cliente por su correo y marca qué proyectos del grupo
 * ve. No hay buscador de clientes: se piensa en la persona que se quiere sumar, no
 * en encontrarla en un directorio.
 *
 * Las casillas de cada cliente se guardan de una: el servidor sincroniza la
 * selección completa dentro del grupo, así que tildar y destildar es la única
 * operación que hay que entender.
 */

interface WorkOption {
  id: string;
  name: string;
}

interface ClientRow {
  id: string;
  email: string;
  name: string;
  firstLoginAt: string | null;
  workIds: string[];
}

export function GroupClientsPanel({ groupId }: { groupId: string }) {
  const [works, setWorks] = useState<WorkOption[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    void api<{ works: WorkOption[]; clients: ClientRow[] }>(`/api/groups/${groupId}/clients`)
      .then((d) => {
        setWorks(d.works);
        setClients(d.clients);
      })
      .catch((e: Error) => setStatus(e.message));
  };
  useEffect(load, [groupId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await api(`/api/groups/${groupId}/clients`, {
        method: "POST",
        body: JSON.stringify({ email, name, workIds: selected }),
      });
      setEmail("");
      setName("");
      setSelected([]);
      load();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleWork = async (client: ClientRow, workId: string, enabled: boolean) => {
    const workIds = enabled
      ? [...client.workIds, workId]
      : client.workIds.filter((w) => w !== workId);
    // Actualización optimista: la casilla responde al toque y se corrige al recargar.
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, workIds } : c)));
    try {
      await api(`/api/groups/${groupId}/clients/${client.id}`, {
        method: "PUT",
        body: JSON.stringify({ workIds }),
      });
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      load();
    }
  };

  const removeFromGroup = async (client: ClientRow) => {
    const ok = await showConfirm(
      `${client.name} va a dejar de ver todos los proyectos de este grupo. Su cuenta y los accesos que tenga en otros grupos no se tocan.`,
      { title: "Quitar acceso al grupo", confirmLabel: "Quitar acceso", danger: true },
    );
    if (!ok) return;
    try {
      await api(`/api/groups/${groupId}/clients/${client.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p className="muted">
        Un cliente entra con su correo y ve solo los proyectos que le marques, sin poder modificar
        nada.
      </p>

      <form onSubmit={add} className="card" style={{ display: "grid", gap: 8 }}>
        <strong>Agregar cliente</strong>
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

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted">Proyectos que va a ver</legend>
          {works.length === 0 ? (
            <p className="muted">Este grupo todavía no tiene proyectos activos.</p>
          ) : (
            <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
              {works.map((w) => (
                <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(w.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, w.id] : prev.filter((x) => x !== w.id),
                      )
                    }
                  />
                  {w.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || selected.length === 0}
        >
          {saving ? "Agregando…" : "Agregar cliente"}
        </button>
      </form>

      {status && <p className="form-error">{status}</p>}

      {clients.length === 0 ? (
        <p className="muted">Todavía no hay clientes con acceso a proyectos de este grupo.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
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
                    onClick={() => void removeFromGroup(c)}
                    aria-label={`Quitar el acceso de ${c.name} a este grupo`}
                    title="Quitar acceso al grupo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                {works.map((w) => (
                  <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={c.workIds.includes(w.id)}
                      onChange={(e) => void toggleWork(c, w.id, e.target.checked)}
                    />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
