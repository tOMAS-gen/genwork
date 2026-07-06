"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  AtSign,
  BookTemplate,
  ChevronRight,
  FileText,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Star,
  User,
  Users,
} from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import { useCloseMobileDrawer, useDrawerMini } from "@/components/nav/Shell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface Item {
  id: string;
  name: string;
}

interface SectorItem extends Item {
  color: string | null;
  group: { name: string } | null;
}

interface GroupItem extends Item {
  color: string | null;
}

interface WorkItem extends Item {
  labels: { keyName: string; color: string }[];
}

const CAP = 10;

/** Iniciales del nombre (máx. 2 letras) para el avatar de respaldo. */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}


/**
 * Drawer con sublistas expandibles de proyectos, sectores y grupos (FR-107, FR-309):
 * navegación directa sin pasar por el listado; se refresca en vivo (SSE).
 */
export function DrawerNav({
  isSuperAdmin,
  userEmail,
  userName,
  userImage,
  logoutButton,
}: {
  isSuperAdmin: boolean;
  userEmail?: string | null;
  userName?: string | null;
  userImage?: string | null;
  logoutButton?: React.ReactNode;
}) {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [openWorks, setOpenWorks] = useState(true);
  const [openSectors, setOpenSectors] = useState(false);
  const [openGroups, setOpenGroups] = useState(false);
  const closeMobileDrawer = useCloseMobileDrawer();
  const mini = useDrawerMini();

  const load = useCallback(() => {
    void api<WorkItem[]>("/api/works").then(setWorks).catch(() => {});
    void api<SectorItem[]>("/api/sectors").then(setSectors).catch(() => {});
    void api<GroupItem[]>("/api/groups").then(setGroups).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  if (mini) {
    return (
      <nav className="sidebar-nav sidebar-nav-mini">
        {userName && (
          <div className="rail-link rail-avatar" data-tooltip={userEmail ? `${userName} · ${userEmail}` : userName}>
            {userImage ? (
              <img src={userImage} alt="" aria-hidden="true" className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar sidebar-avatar-fallback">{getInitials(userName)}</div>
            )}
          </div>
        )}
        <div className="sidebar-scroll">
          <Link href="/notes" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Mis notas">
            <FileText size={18} />
          </Link>
          <Link href="/references" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Mis referencias">
            <AtSign size={18} />
          </Link>
          <Link href="/" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Proyectos">
            <FileText size={18} />
          </Link>
          <Link href="/sectors" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Sectores">
            <Layers size={18} />
          </Link>
          <Link href="/groups" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Grupos">
            <Users size={18} />
          </Link>
          <Link href="/board" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Vista de tareas">
            <LayoutDashboard size={18} />
          </Link>
          {isSuperAdmin && (
            <Link href="/admin" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Administración">
              <Settings size={18} />
            </Link>
          )}
        </div>
        <div className="sidebar-footer">
          <ThemeToggle mini />
          <div className="rail-link" data-tooltip="Salir">
            {logoutButton}
          </div>
        </div>
      </nav>
    );
  }

  const sublistIcon = (base: string) => {
    if (base === "/works") return FileText;
    if (base === "/sectors") return Layers;
    return Users;
  };

  const group = (
    label: string,
    href: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    items: (Item | WorkItem | SectorItem)[],
    base: string,
    icon: React.ComponentType<{ size?: number; className?: string }>,
  ) => {
    const ItemIcon = sublistIcon(base);
    const Icon = icon;
    const sublistId = `nav-sublist-${base.replace(/\W/g, "")}`;
    return (
      <div>
        <div
          className={`nav-group ${open ? "open" : ""}`}
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={sublistId}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(!open);
            }
          }}
        >
          <ChevronRight size={15} className="chev" />
          <Icon size={16} className="muted" />
          <span style={{ flex: 1 }}>{label}</span>
          <Link
            href={href}
            onClick={(e) => {
              e.stopPropagation();
              closeMobileDrawer();
            }}
            className="muted"
            style={{ fontSize: "var(--text-xs)" }}
          >
            ver todos
          </Link>
        </div>
        {open && (
          <div className="nav-sublist" id={sublistId} role="group" aria-label={label}>
            {label === "Proyectos" && (
              <>
                <Link href="/" onClick={closeMobileDrawer}>
                  <LayoutGrid size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Todos los proyectos
                </Link>
                <Link href="/?filter=mine" onClick={closeMobileDrawer}>
                  <User size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Mis proyectos
                </Link>
                <Link href="/?filter=favorites" onClick={closeMobileDrawer}>
                  <Star size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Favoritos
                </Link>
                <Link href="/?filter=templates" onClick={closeMobileDrawer}>
                  <BookTemplate size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Plantillas
                </Link>
                <Link href="/?status=ARCHIVED" className="muted" onClick={closeMobileDrawer}>
                  <Archive size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Archivados
                </Link>
              </>
            )}
            {items.slice(0, CAP).map((it) => {
              const color =
                base === "/works" && "labels" in it
                  ? getProjectColor((it as WorkItem).labels)
                  : base === "/sectors" && "color" in it
                    ? (it as SectorItem).color
                    : base === "/groups" && "color" in it
                      ? (it as GroupItem).color
                      : null;
              return (
                <Link key={it.id} href={`${base}/${it.id}`} title={it.name} onClick={closeMobileDrawer}>
                  <ItemIcon
                    size={14}
                    className={color ? `label-${color.toLowerCase()}` : ""}
                    style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4, background: "transparent" }}
                  />
                  {it.name}
                  {base === "/sectors" && "group" in it && (it as SectorItem).group && (
                    <span className="muted" style={{ fontSize: "var(--text-xs)", marginLeft: 4 }}>
                      · {(it as SectorItem).group!.name}
                    </span>
                  )}
                </Link>
              );
            })}
            {items.length === 0 && <span className="muted" style={{ padding: "var(--space-1) var(--space-2)" }}>—</span>}
            {items.length > CAP && (
              <Link href={href} className="muted" onClick={closeMobileDrawer}>
                +{items.length - CAP} más…
              </Link>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sidebar-nav">
      {userName && (
        <div className="sidebar-profile">
          {userImage ? (
            <img src={userImage} alt="" aria-hidden="true" className="sidebar-avatar" />
          ) : (
            <div className="sidebar-avatar sidebar-avatar-fallback">{getInitials(userName)}</div>
          )}
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{userName}</span>
            {userEmail && <span className="sidebar-user-email">{userEmail}</span>}
          </div>
        </div>
      )}
      <div className="sidebar-scroll">
        <Link
          className="nav"
          href="/notes"
          onClick={closeMobileDrawer}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <FileText size={16} className="muted" /> Mis notas
        </Link>
        <Link
          className="nav"
          href="/references"
          onClick={closeMobileDrawer}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <AtSign size={16} className="muted" /> Mis referencias
        </Link>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {group("Proyectos", "/", openWorks, setOpenWorks, works, "/works", FileText)}
          {group("Sectores", "/sectors", openSectors, setOpenSectors, sectors, "/sectors", Layers)}
          {group("Grupos", "/groups", openGroups, setOpenGroups, groups, "/groups", Users)}
          <Link
            className="nav"
            href="/board"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <LayoutDashboard size={16} className="muted" /> Vista de tareas
          </Link>
          {isSuperAdmin && (
            <Link
              className="nav"
              href="/admin"
              onClick={closeMobileDrawer}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <Settings size={16} className="muted" /> Administración
            </Link>
          )}
        </div>
      </div>
      <div className="sidebar-footer">
        <ThemeToggle />
        {logoutButton}
      </div>
    </nav>
  );
}
