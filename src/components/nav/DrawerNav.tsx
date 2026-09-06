"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  AtSign,
  BookTemplate,
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
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import {
  sortByPendingDesc,
  sumPending,
  type SortableItem,
} from "@/lib/nav/drawerSort";

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
  /** feature 054: contador de tareas no finalizadas del sector. */
  metrics?: { total: number; done: number; pending: number };
}

interface GroupItem extends Item {
  color: string | null;
  /** feature 054: suma de tareas no finalizadas de los sectores del grupo. */
  pendingCount?: number;
}

interface WorkItem extends Item {
  groupName?: string | null;
  labels: { keyName: string; color: string; isPrimary?: boolean }[];
  /** feature 054: contador de tareas no finalizadas del proyecto. */
  pendingCount?: number;
}

/**
 * feature 054: proyecta cada tipo de ítem a { id, name, pendingCount } para
 * poder ordenarlos y sumarlos con los helpers puros de drawerSort.
 */
function pendingOf(item: Item | WorkItem | SectorItem | GroupItem): number {
  if ("metrics" in item && item.metrics) return item.metrics.pending;
  if ("pendingCount" in item && typeof item.pendingCount === "number") {
    return item.pendingCount;
  }
  return 0;
}

function toSortable(
  item: Item | WorkItem | SectorItem | GroupItem,
): SortableItem {
  return { id: item.id, name: item.name, pendingCount: pendingOf(item) };
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
  userEmail,
  userName,
  userImage,
  logoutButton,
}: {
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
  const searchParams = useSearchParams();
  /** Coincidencia por pathname + query relevante: alcanza para saber en qué
   *  proyecto/sector/grupo o sección estás parado. El caso especial es "/"
   *  (dashboard), donde varios links comparten pathname y sólo se distinguen
   *  por ?filter=/?status= — "Todos los proyectos" (sin query) sólo está
   *  activo cuando ninguno de esos filtros está aplicado. */
  const isActive = useCallback(
    (href: string) => {
      const [path, query] = href.split("?");
      const pathMatches = path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
      if (!pathMatches) return false;
      if (!query) {
        return path !== "/" || (!searchParams.get("filter") && !searchParams.get("status"));
      }
      const hrefParams = new URLSearchParams(query);
      return Array.from(hrefParams.entries()).every(([k, v]) => searchParams.get(k) === v);
    },
    [pathname, searchParams],
  );

  /** Configuración es un solo destino en el drawer, pero sus secciones viven
   *  repartidas entre /settings (cuenta) y /admin (sistema). */
  const settingsActive = isActive("/settings") || isActive("/admin");

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
          <Link href="/notes" onClick={closeMobileDrawer} className={`rail-link${isActive("/notes") ? " nav-active" : ""}`} aria-current={isActive("/notes") ? "page" : undefined} data-tooltip="Mis notas" aria-label="Mis notas">
            <FileText size={18} />
          </Link>
          <Link href="/references" onClick={closeMobileDrawer} className={`rail-link${isActive("/references") ? " nav-active" : ""}`} aria-current={isActive("/references") ? "page" : undefined} data-tooltip="Mis referencias" aria-label="Mis referencias">
            <AtSign size={18} />
          </Link>
          <Link href="/" onClick={closeMobileDrawer} className={`rail-link${isActive("/") ? " nav-active" : ""}`} aria-current={isActive("/") ? "page" : undefined} data-tooltip="Proyectos" aria-label="Proyectos">
            <FileText size={18} />
          </Link>
          <Link href="/sectors" onClick={closeMobileDrawer} className={`rail-link${isActive("/sectors") ? " nav-active" : ""}`} aria-current={isActive("/sectors") ? "page" : undefined} data-tooltip="Sectores" aria-label="Sectores">
            <Layers size={18} />
          </Link>
          <Link href="/groups" onClick={closeMobileDrawer} className={`rail-link${isActive("/groups") ? " nav-active" : ""}`} aria-current={isActive("/groups") ? "page" : undefined} data-tooltip="Grupos" aria-label="Grupos">
            <Users size={18} />
          </Link>
          <Link href="/board" onClick={closeMobileDrawer} className={`rail-link${isActive("/board") ? " nav-active" : ""}`} aria-current={isActive("/board") ? "page" : undefined} data-tooltip="Vista de tareas" aria-label="Vista de tareas">
            <LayoutDashboard size={18} />
          </Link>
          <Link href="/reminders" onClick={closeMobileDrawer} className={`rail-link${isActive("/reminders") ? " nav-active" : ""}`} aria-current={isActive("/reminders") ? "page" : undefined} data-tooltip="Recordatorios" aria-label="Recordatorios">
            <Calendar size={18} />
          </Link>
          <Link href="/settings" onClick={closeMobileDrawer} className={`rail-link${settingsActive ? " nav-active" : ""}`} aria-current={settingsActive ? "page" : undefined} data-tooltip="Configuración" aria-label="Configuración">
            <Settings size={18} />
          </Link>
        </div>
        <div className="sidebar-footer">
          <div className="rail-link" data-tooltip="Vence hoy" aria-label="Vence hoy">
            <DueTodayBell />
          </div>
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
    items: (Item | WorkItem | SectorItem | GroupItem)[],
    base: string,
    icon: React.ComponentType<{ size?: number; className?: string }>,
  ) => {
    const ItemIcon = sublistIcon(base);
    const Icon = icon;
    const sublistId = `nav-sublist-${base.replace(/\W/g, "")}`;

    // feature 054: ordenar por tareas no finalizadas (desc) con desempate
    // alfabético; total de sección se calcula sobre TODOS los items visibles
    // al usuario (no solo el top CAP).
    const sortableSnapshot = items.map(toSortable);
    const sortedSortable = sortByPendingDesc(sortableSnapshot);
    const orderedIds = new Map(sortedSortable.map((s, i) => [s.id, i]));
    const sortedItems = [...items].sort(
      (a, b) => (orderedIds.get(a.id) ?? 0) - (orderedIds.get(b.id) ?? 0),
    );
    const sectionTotal = sumPending(sortableSnapshot);

    return (
      <div>
        {/* Toggle (expandir/contraer) y "ver todos" son hermanos, no un Link
            anidado dentro de un role=button: dos controles interactivos
            anidados son inválidos para teclado y lectores de pantalla. */}
        <div className={`nav-group ${open ? "open" : ""}`}>
          <button
            type="button"
            className="nav-group-toggle"
            aria-expanded={open}
            aria-controls={sublistId}
            onClick={() => setOpen(!open)}
          >
            <ChevronRight size={15} className="chev" />
            <Icon size={16} className="muted" />
            <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
            <Badge
              count={sectionTotal}
              ariaLabelSingular={`${label}: 1 tarea no finalizada`}
              ariaLabelPlural={`${label}: tareas no finalizadas`}
              className="badge-inline-end"
            />
          </button>
          <Link
            href={href}
            onClick={closeMobileDrawer}
            className="muted"
            style={{ fontSize: "var(--text-xs)", marginLeft: 6 }}
          >
            ver todos
          </Link>
        </div>
        {open && (
          <div className="nav-sublist" id={sublistId} role="group" aria-label={label}>
            {label === "Proyectos" && (
              <>
                <Link
                  href="/"
                  className={isActive("/") ? "nav-active" : ""}
                  aria-current={isActive("/") ? "page" : undefined}
                  onClick={closeMobileDrawer}
                >
                  <LayoutGrid size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Todos los proyectos
                </Link>
                <Link
                  href="/?filter=mine"
                  className={isActive("/?filter=mine") ? "nav-active" : ""}
                  aria-current={isActive("/?filter=mine") ? "page" : undefined}
                  onClick={closeMobileDrawer}
                >
                  <User size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Mis proyectos
                </Link>
                <Link
                  href="/?filter=favorites"
                  className={isActive("/?filter=favorites") ? "nav-active" : ""}
                  aria-current={isActive("/?filter=favorites") ? "page" : undefined}
                  onClick={closeMobileDrawer}
                >
                  <Star size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Favoritos
                </Link>
                <Link
                  href="/?filter=templates"
                  className={isActive("/?filter=templates") ? "nav-active" : ""}
                  aria-current={isActive("/?filter=templates") ? "page" : undefined}
                  onClick={closeMobileDrawer}
                >
                  <BookTemplate size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Plantillas
                </Link>
                <Link
                  href="/?status=ARCHIVED"
                  className={`muted${isActive("/?status=ARCHIVED") ? " nav-active" : ""}`}
                  aria-current={isActive("/?status=ARCHIVED") ? "page" : undefined}
                  onClick={closeMobileDrawer}
                >
                  <Archive size={14} style={{ flexShrink: 0, verticalAlign: -2, marginRight: 4 }} />
                  Archivados
                </Link>
              </>
            )}
            {sortedItems.slice(0, CAP).map((it) => {
              const workGroupName = base === "/works" && "groupName" in it ? (it as WorkItem).groupName : null;
              const itemName = workGroupName ? `${workGroupName} — ${it.name}` : it.name;
              const color =
                base === "/works" && "labels" in it
                  ? getProjectColor((it as WorkItem).labels)
                  : base === "/sectors" && "color" in it
                    ? (it as SectorItem).color
                    : base === "/groups" && "color" in it
                      ? (it as GroupItem).color
                      : null;
              const itemHref = `${base}/${it.id}`;
              const itemPending = pendingOf(it);
              return (
                <Link
                  key={it.id}
                  href={itemHref}
                  title={itemName}
                  className={isActive(itemHref) ? "nav-active" : ""}
                  aria-current={isActive(itemHref) ? "page" : undefined}
                  onClick={closeMobileDrawer}
                  style={{ display: "flex", alignItems: "center", minWidth: 0 }}
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
                  <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {itemName}
                  </span>
                  {base === "/sectors" && "scope" in it && (it as SectorItem).scope.type !== "PERSONAL" && (
                    <span className="muted" style={{ fontSize: "var(--text-xs)", marginLeft: 4 }}>
                      -{" "}
                      {(it as SectorItem).scope.type === "GROUP"
                        ? (it as SectorItem).scope.groupName
                        : "Global"}
                    </span>
                  )}
                  {/* feature 054: badge de tareas no finalizadas por ítem
                      (oculto si == 0 por el propio componente) */}
                  <Badge count={itemPending} className="badge-inline-end" />
                </Link>
              );
            })}
            {sortedItems.length === 0 && !loaded && (
              <span style={{ display: "block", padding: "var(--space-1) var(--space-2)" }}>
                <Skeleton variant="text" width="70%" />
              </span>
            )}
            {sortedItems.length === 0 && loaded && (
              <span className="muted" style={{ padding: "var(--space-1) var(--space-2)" }}>—</span>
            )}
            {sortedItems.length > CAP && (
              <Link href={href} className="muted" onClick={closeMobileDrawer}>
                +{sortedItems.length - CAP} más…
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
          aria-current={isActive("/notes") ? "page" : undefined}
          href="/notes"
          onClick={closeMobileDrawer}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <FileText size={16} className="muted" /> Mis notas
        </Link>
        <Link
          className={`nav${isActive("/references") ? " nav-active" : ""}`}
          aria-current={isActive("/references") ? "page" : undefined}
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
            aria-current={isActive("/board") ? "page" : undefined}
            href="/board"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <LayoutDashboard size={16} className="muted" /> Vista de tareas
          </Link>
          <Link
            className={`nav${isActive("/reminders") ? " nav-active" : ""}`}
            aria-current={isActive("/reminders") ? "page" : undefined}
            href="/reminders"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <Calendar size={16} className="muted" /> Recordatorios
          </Link>
          <Link
            className={`nav${settingsActive ? " nav-active" : ""}`}
            aria-current={settingsActive ? "page" : undefined}
            href="/settings"
            onClick={closeMobileDrawer}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <Settings size={16} className="muted" /> Configuración
          </Link>
        </div>
      </div>
      <div className="sidebar-footer">
        <DueTodayBell label="Vence hoy" />
        {logoutButton}
      </div>
    </nav>
  );
}
