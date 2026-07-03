"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FolderOpen, LayoutDashboard } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";

interface Item {
  id: string;
  name: string;
}

const CAP = 10;

/**
 * Drawer con sublistas expandibles de proyectos y sectores (FR-107): navegación
 * directa sin pasar por el listado; se refresca en vivo (SSE).
 */
export function DrawerNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [works, setWorks] = useState<Item[]>([]);
  const [sectors, setSectors] = useState<Item[]>([]);
  const [openWorks, setOpenWorks] = useState(true);
  const [openSectors, setOpenSectors] = useState(false);

  const load = useCallback(() => {
    void api<Item[]>("/api/works").then(setWorks).catch(() => {});
    void api<Item[]>("/api/sectors").then(setSectors).catch(() => {});
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const group = (
    label: string,
    href: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    items: Item[],
    base: string,
  ) => (
    <div>
      <div className={`nav-group ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        <ChevronRight size={15} className="chev" />
        <span style={{ flex: 1 }}>{label}</span>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="muted"
          style={{ fontSize: 12 }}
        >
          ver todos
        </Link>
      </div>
      {open && (
        <div className="nav-sublist">
          {items.slice(0, CAP).map((it) => (
            <Link key={it.id} href={`${base}/${it.id}`} title={it.name}>
              {it.name}
            </Link>
          ))}
          {items.length === 0 && <span className="muted" style={{ padding: "6px 8px" }}>—</span>}
          {items.length > CAP && (
            <Link href={href} className="muted">
              +{items.length - CAP} más…
            </Link>
          )}
        </div>
      )}
    </div>
  );

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {group("Proyectos", "/", openWorks, setOpenWorks, works, "/works")}
      {group("Sectores", "/sectors", openSectors, setOpenSectors, sectors, "/sectors")}
      <Link className="nav-group" href="/groups">
        <FolderOpen size={15} className="muted" /> Grupos
      </Link>
      <Link className="nav-group" href="/board">
        <LayoutDashboard size={15} className="muted" /> Dashboard
      </Link>
      {isSuperAdmin && (
        <Link className="nav-group" href="/admin">
          Administración
        </Link>
      )}
    </nav>
  );
}
