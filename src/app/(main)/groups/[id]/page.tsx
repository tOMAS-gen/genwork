"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { Inbox, Palette, Trash2, Users } from "@/components/ui/icons";

const COLOR_OPTIONS = [
  "RED", "ORANGE", "AMBER", "GREEN", "TEAL",
  "BLUE", "INDIGO", "VIOLET", "PINK", "GRAY",
] as const;

interface Membership {
  role: "ADMIN" | "MEMBER";
  user: { id: string; email: string; name: string };
}

interface Group {
  id: string;
  name: string;
  color: string | null;
  ownerId: string;
  publicRead: boolean;
  memberships: Membership[];
  _count: { sectors: number; works: number };
}

interface Work {
  id: string;
  name: string;
  dueDate: string | null;
  stage: { id: string; name: string; color: string | null } | null;
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = useState<Group | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [status, setStatus] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  const load = useCallback(() => {
    void api<Group[]>("/api/groups")
      .then((gs) => setGroup(gs.find((g) => g.id === id) ?? null))
      .catch(() => {});
    void api<Work[]>(`/api/works?groupId=${id}`)
      .then(setWorks)
      .catch(() => {});
  }, [id]);

  useEffect(load, [load]);

  if (!group) {
    return (
      <div className="sheet">
        <div className="sheet-header">
          <div>
            <Skeleton variant="text" height="32px" width="40%" />
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const changeColor = async (color: string) => {
    setShowPalette(false);
    try {
      await api(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify({ color }) });
      setGroup((prev) => prev ? { ...prev, color } : prev);
    } catch {}
  };

  const deleteGroup = async () => {
    try {
      await api(`/api/groups/${id}`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

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
    <div className="sheet">
      <div style={{ marginBottom: "var(--space-2)" }}>
        <Breadcrumbs items={[{ label: "Grupos", href: "/groups" }, { label: group.name }]} />
      </div>

      <div className="sheet-header">
        <div>
          <div className="sheet-title-row">
            <div style={{ position: "relative" }}>
              <span
                className={`project-dot label-${(group.color ?? "gray").toLowerCase()}`}
              />
              {showPalette && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 6,
                    display: "flex",
                    gap: 6,
                    padding: 8,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    boxShadow: "var(--shadow-md)",
                    zIndex: 10,
                  }}
                >
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sc-dot label-${c.toLowerCase()}`}
                      style={{ border: "none", padding: 0, cursor: "pointer" }}
                      onClick={() => void changeColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="sheet-title">{group.name}</h1>
              <p className="sheet-desc">
                {group.memberships.length} miembros · {group._count.sectors} sectores · {group._count.works} proyectos
                {group.publicRead && " · Lectura pública"}
              </p>
            </div>
          </div>
        </div>
        <Menu
          items={[
            {
              label: "Cambiar color",
              icon: <Palette size={16} />,
              onSelect: () => setShowPalette((v) => !v),
            },
            {
              label: "Eliminar grupo",
              icon: <Trash2 size={16} />,
              danger: true,
              onSelect: () => setConfirmDelete(true),
            },
          ]}
          label="Acciones del grupo"
        />
      </div>

      {/* Visibilidad */}
      <div style={{ marginTop: "var(--space-3)" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={group.publicRead}
            onChange={() => void togglePublicRead()}
            style={{ width: "auto" }}
          />
          <span>Lectura para no miembros (ej.: visible en el televisor)</span>
        </label>
      </div>

      {/* Miembros */}
      <div style={{ marginTop: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>Miembros</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
          <input
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addMember()}
            style={{ flex: 1, minWidth: 200 }}
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
        {status && <p style={{ color: "var(--danger)", margin: "0 0 var(--space-2)" }}>{status}</p>}
        <div>
          {group.memberships.map((m) => (
            <div
              key={m.user.id}
              className="task"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Users size={14} className="muted" />
                <span>{m.user.name}</span>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>({m.user.email})</span>
                {m.user.id === group.ownerId ? (
                  <span className="tag tag-work">admin principal</span>
                ) : (
                  m.role === "ADMIN" && <span className="tag tag-exec">admin</span>
                )}
              </span>
              {m.user.id !== group.ownerId && (
                <button className="btn" style={{ fontSize: "var(--text-sm)" }} onClick={() => void removeMember(m.user.id)}>
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Proyectos */}
      <div style={{ marginTop: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>
          Proyectos ({works.length})
        </h2>
        {works.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Sin proyectos"
            description="Creá un proyecto y asignalo a este grupo."
          />
        ) : (
          <div>
            {works.map((work) => {
              const parsedDue = work.dueDate ? new Date(work.dueDate) : null;
              const fmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" });
              return (
                <Link
                  key={work.id}
                  href={`/works/${work.id}`}
                  className="task"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <strong>{work.name}</strong>
                    {work.stage && (
                      <span className="stage-badge" style={{ color: work.stage.color || "var(--muted)" }}>
                        <span className="stage-dot" style={{ background: work.stage.color || "var(--muted)" }} />
                        {work.stage.name}
                      </span>
                    )}
                  </span>
                  {parsedDue && (
                    <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
                      {fmt.format(parsedDue)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar grupo"
      >
        <p className="muted" style={{ margin: 0 }}>
          Se eliminará el grupo <strong>{group.name}</strong>. Los sectores y proyectos del grupo
          quedarán sin grupo asignado.
        </p>
        <div className="dialog-actions">
          <button className="btn" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setConfirmDelete(false);
              void deleteGroup();
            }}
          >
            Eliminar grupo
          </button>
        </div>
      </Dialog>
    </div>
  );
}
