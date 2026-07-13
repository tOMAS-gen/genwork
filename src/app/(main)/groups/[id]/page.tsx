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
import { RenameDialog } from "@/components/ui/RenameDialog";
import { Inbox, Pencil, Trash2, Users } from "@/components/ui/icons";
import { usePageTitle } from "@/lib/usePageTitle";
import { LabelAdmin } from "@/components/works/LabelAdmin";
import { ColorField } from "@/components/ui/ColorField";
import { MemberSearchField, type MemberCandidate } from "@/components/groups/MemberSearchField";

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
  _count: { works: number };
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
  const [selectedMember, setSelectedMember] = useState<MemberCandidate | null>(null);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [globalRole, setGlobalRole] = useState<"SUPERADMIN" | "MEMBER" | "READER" | null>(null);
  const router = useRouter();

  usePageTitle(group?.name ?? null);

  const load = useCallback(() => {
    void api<Group[]>("/api/groups")
      .then((gs) => setGroup(gs.find((g) => g.id === id) ?? null))
      .catch(() => {});
    void api<Work[]>(`/api/works?groupId=${id}`)
      .then(setWorks)
      .catch(() => {});
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    void api<{ id: string; globalRole: "SUPERADMIN" | "MEMBER" | "READER" }>("/api/me")
      .then((me) => {
        setCurrentUserId(me.id);
        setGlobalRole(me.globalRole);
      })
      .catch(() => {});
  }, []);

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

  const changeColor = async (hex: string) => {
    const color = hex === "" ? null : hex;
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
    if (!selectedMember) return;
    try {
      await api(`/api/groups/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: selectedMember.email, role }),
      });
      setSelectedMember(null);
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

  // Admin de grupo (FR-021/canManageGroup): un ADMIN en memberships de este grupo.
  // El owner ya recibe membership ADMIN al crear el grupo (ver POST /api/groups),
  // así que no hace falta comparar contra group.ownerId por separado.
  const isGroupAdmin =
    currentUserId !== null &&
    group.memberships.some((m) => m.user.id === currentUserId && m.role === "ADMIN");
  // FR-002 (specs/049-renombrar-entidades): renombrar grupo también habilitado para SUPERADMIN global,
  // aunque no tenga membership ADMIN en este grupo puntual.
  const isSuperAdmin = globalRole === "SUPERADMIN";

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
            <ColorField
              nullable
              value={group.color}
              onChange={(hex) => void changeColor(hex)}
              ariaLabel="Color del grupo"
              align="start"
            />
            <h1 className="sheet-title">{group.name}</h1>
          </div>
          <p className="sheet-desc">
            {group.memberships.length} miembros · {group._count.works} proyectos
            {group.publicRead && " · Lectura pública"}
          </p>
        </div>
        <Menu
          items={[
            ...(isGroupAdmin || isSuperAdmin
              ? [
                  {
                    label: "Renombrar…",
                    icon: <Pencil size={16} />,
                    onSelect: () => setRenaming(true),
                  },
                ]
              : []),
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
          <div style={{ flex: 1, minWidth: 200 }}>
            <MemberSearchField
              groupId={id}
              selected={selectedMember}
              onSelect={setSelectedMember}
              onClear={() => setSelectedMember(null)}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
            style={{ width: 140 }}
          >
            <option value="MEMBER">Miembro</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <button className="btn btn-primary" disabled={!selectedMember} onClick={() => void addMember()}>
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

      {/* Etiquetas del grupo (solo administradores; el servidor igualmente aplica el 403) */}
      {isGroupAdmin && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>
            Etiquetas del grupo
          </h2>
          <LabelAdmin scope={{ kind: "group", groupId: id }} />
        </div>
      )}

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

      <RenameDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Renombrar grupo"
        label="grupo"
        initialName={group.name}
        onSave={async (name) => {
          await api(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
          load();
        }}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar grupo"
      >
        <p className="muted" style={{ margin: 0 }}>
          Se eliminará el grupo <strong>{group.name}</strong>. Los proyectos del grupo quedarán
          sin grupo asignado.
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
