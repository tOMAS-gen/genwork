"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  AtSign,
  BookTemplate,
  Bot,
  Calendar,
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
import { DueTodayBell } from "@/components/reminders/DueTodayBell";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { getProjectColor } from "@/lib/domain/works/projectColor";
import { useCloseMobileDrawer, useDrawerMini } from "@/components/nav/Shell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

interface Item {
  id: string;
  name: string;
}

interface SectorItem extends Item {
  color: string | null;
  scope: {
    type: "GROUP" | "PERSONAL" | "GLOBAL";
    groupId?: string;
    groupName?: string;
    ownerId?: string;
  };
}

interface GroupItem extends Item {
  color: string | null;
}

interface WorkItem extends Item {
  labels: { keyName: string; color: string; isPrimary?: boolean }[];
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
  const [loaded, setLoaded] = useState(false);
  const closeMobileDrawer = useCloseMobileDrawer();
  const mini = useDrawerMini();
  const pathname = usePathname();
  /** Coincidencia por pathname (sin query): alcanza para saber en qué
   *  proyecto/sector/grupo o sección estás parado. */
  const isActive = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      if (path === "/") return pathname === "/";
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  const load = useCallback(() => {
    void Promise.allSettled([
      api<WorkItem[]>("/api/works").then(setWorks).catch(() => {}),
      api<SectorItem[]>("/api/sectors").then(setSectors).catch(() => {}),
      api<GroupItem[]>("/api/groups").then(setGroups).catch(() => {}),
    ]).then(() => setLoaded(true));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  if (mini) {
    return (
      <nav className="sidebar-nav sidebar-nav-mini">
        {userName && (
          <div className="rail-link rail-avatar" data-tooltip={userEmail ? `${userName} · ${userEmail}` : userName} aria-label={userEmail ? `${userName} · ${userEmail}` : userName}>
            {userImage ? (
              <img src={userImage} alt="" aria-hidden="true" className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar sidebar-avatar-fallback">{getInitials(userName)}</div>
            )}
          </div>
        )}
        <div className="sidebar-scroll">
          <Link href="/notes" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Mis notas" aria-label="Mis notas">
            <FileText size={18} />
          </Link>
          <Link href="/references" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Mis referencias" aria-label="Mis referencias">
            <AtSign size={18} />
          </Link>
          <Link href="/" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Proyectos" aria-label="Proyectos">
            <FileText size={18} />
          </Link>
          <Link href="/sectors" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Sectores" aria-label="Sectores">
            <Layers size={18} />
          </Link>
          <Link href="/groups" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Grupos" aria-label="Grupos">
            <Users size={18} />
          </Link>
          <Link href="/board" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Vista de tareas" aria-label="Vista de tareas">
            <LayoutDashboard size={18} />
          </Link>
          <Link href="/reminders" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Recordatorios" aria-label="Recordatorios">
            <Calendar size={18} />
          </Link>
          <Link href="/settings" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Asistentes conectados" aria-label="Asistentes conectados">
            <Bot size={18} />
          </Link>
          {isSuperAdmin && (
            <Link href="/admin" onClick={closeMobileDrawer} className="rail-link" data-tooltip="Administración" aria-label="Administración">
              <Settings size={18} />
            </Link>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="rail-link" data-tooltip="Vence hoy" aria-label="Vence hoy">
            <DueTodayBell />
          </div>
          <ThemeToggle mini />
          <div className="rail-link" data-tooltip="Salir" aria-label="Salir">
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
                <Link href="/" className={isActive("/") ? "nav-active" : ""} onClick={closeMobileDrawer}>
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
              const itemHref = `${base}/${it.id}`;
              return (
                <Link
                  key={it.id}
                  href={itemHref}
                  title={it.name}
                  className={isActive(itemHref) ? "nav-active" : ""}
                  onClick={closeMobileDrawer}
                >
                  <ItemIcon
                    size={14}
                    className={color ? "color-badge" : ""}
                    style={
                      color
                        ? ({ "--c": color, flexShrink: 0, verticalAlign: -2, marginRight: 4, background: "transparent", border: "none", padding: 0 } as React.CSSProperties)
                        : { flexShrink: 0, verticalAlign: -2, marginRight: 4, background: "transparent" }
                    }
                  />
                  {it.name}
                  {base === "/sectors" && "scope" in it && (it as SectorItem).scope.type !== "PERSONAL" && (
                    <span className="muted" style={{ fontSize: "var(--text-xs)", marginLeft: 4 }}>
                      -{" "}
                      {(it as SectorItem).scope.type === "GROUP"
                        ? (it as SectorItem).scope.groupName
                        : "Global"}
                    </span>
                  )}
                </Link>
              );
            })}
            {items.length === 0 && !loaded && (
              <span style={{ display: "block", padding: "var(--space-1) var(--space-2)" }}>
                <Skeleton variant="text" width="70%" />
              </span>
            )}
            {items.length === 0 && loaded && (
              <span className="muted" style={{ padding: "var(--space-1) var(--space-2)" }}>—</span>
            )}
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
          className={`nav${isActive("/notes") ? " nav-active" : ""}`}
          href="/notes"
          onClick={closeMobileDrawer}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <FileText size={16} className="muted" /> Mis notas
        </Link>
        <Link
          className={`nav${isActive("/references") ? " nav-active" : ""}`}
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
            className={`nav${isActive("/board") ? " nav-active" : ""}`}
            href="/board"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <LayoutDashboard size={16} className="muted" /> Vista de tareas
          </Link>
          <Link
            className={`nav${isActive("/reminders") ? " nav-active" : ""}`}
            href="/reminders"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <Calendar size={16} className="muted" /> Recordatorios
          </Link>
          <Link
            className={`nav${isActive("/settings") ? " nav-active" : ""}`}
            href="/settings"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <Bot size={16} className="muted" /> Asistentes conectados
          </Link>
          {isSuperAdmin && (
            <Link
              className={`nav${isActive("/admin") ? " nav-active" : ""}`}
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
        <DueTodayBell label="Vence hoy" />
        <ThemeToggle />
        {logoutButton}
      </div>
    </nav>
  );
}
