"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, PanelLeft, PanelLeftClose, X } from "@/components/ui/icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const STORAGE_KEY = "gw:drawer-collapsed";
const WIDTH_KEY = "gw:drawer-width";
const MIN_W = 240;
const MAX_W = 400;
const DEFAULT_W = 240;
const MINI_W = 48;
const MOBILE_QUERY = "(max-width: 767px)";

const MobileDrawerContext = createContext<() => void>(() => {});

export function useCloseMobileDrawer() {
  return useContext(MobileDrawerContext);
}

/** Modo rail: sidebar colapsado a solo íconos con tooltip (no en mobile, que usa el drawer completo deslizable). */
const DrawerMiniContext = createContext(false);

export function useDrawerMini() {
  return useContext(DrawerMiniContext);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  // useLayoutEffect (no useEffect): corre antes del primer paint, así el arranque
  // en `false` nunca llega a pintarse como un frame de layout desktop en mobile.
  useLayoutEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

function readWidth(): number {
  if (typeof window === "undefined") return DEFAULT_W;
  const v = parseInt(window.localStorage.getItem(WIDTH_KEY) ?? "", 10);
  return Number.isFinite(v) ? Math.min(MAX_W, Math.max(MIN_W, v)) : DEFAULT_W;
}

export function Shell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    const w = parseInt(window.localStorage.getItem(WIDTH_KEY) ?? "", 10);
    if (Number.isFinite(w)) setWidth(Math.min(MAX_W, Math.max(MIN_W, w)));
  }, []);
  const dragging = useRef(false);

  const collapse = useCallback(() => {
    setCollapsed(true);
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    try { window.localStorage.setItem(STORAGE_KEY, "0"); } catch { /* */ }
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    mobileTriggerRef.current?.focus();
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, e.clientX));
      setWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        try { window.localStorage.setItem(WIDTH_KEY, String(w)); } catch { /* */ }
        return w;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const isMobile = useIsMobile();
  const mini = collapsed && !isMobile;
  const asideWidth = mini ? MINI_W : width;
  const asideRef = useRef<HTMLElement>(null);

  // Foco atrapado + Escape mientras el drawer mobile está abierto (hallazgo
  // Crítico de accesibilidad: sin esto, Tab se escapa al contenido de atrás
  // y no hay forma de cerrar por teclado).
  useEffect(() => {
    if (!mobileOpen) return;
    const aside = asideRef.current;
    if (!aside) return;
    const focusable = aside.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobile();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <MobileDrawerContext.Provider value={closeMobile}>
      <DrawerMiniContext.Provider value={mini}>
        <div className="shell" style={{ gridTemplateColumns: `${asideWidth}px minmax(0, 1fr)` }}>
          <header className="shell-topbar">
            <button
              ref={mobileTriggerRef}
              type="button"
              className="icon-btn mobile-menu-btn"
              aria-label="Abrir menú"
              onClick={openMobile}
            >
              <Menu size={20} />
            </button>
            <BrandLogo />
            <ThemeToggle mini />
          </header>
          <button
            type="button"
            className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
            onClick={closeMobile}
            aria-label="Cerrar menú"
            tabIndex={mobileOpen ? 0 : -1}
          />
          <aside
            ref={asideRef}
            className={`sidebar ${mini ? "mini" : ""} ${mobileOpen ? "mobile-open" : ""}`}
            style={{ width: asideWidth }}
            role={isMobile && mobileOpen ? "dialog" : undefined}
            aria-modal={isMobile && mobileOpen ? true : undefined}
            aria-label="Menú"
          >
            <div className="sidebar-header">
              {!mini && <span className="section-label">Espacio de trabajo</span>}
              <button
                type="button"
                className="icon-btn drawer-close-mobile"
                aria-label="Cerrar menú"
                onClick={closeMobile}
              >
                <X size={18} />
              </button>
              <button
                type="button"
                className="icon-btn drawer-collapse-desktop"
                aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
                title={collapsed ? "Mostrar menú" : "Ocultar menú"}
                onClick={collapsed ? expand : collapse}
              >
                {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
            {sidebar}
            {!mini && (
              <div
                className="sidebar-resize-handle"
                onMouseDown={onResizeStart}
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionar menú lateral"
                tabIndex={0}
              />
            )}
          </aside>
          <main className="main">{children}</main>
        </div>
      </DrawerMiniContext.Provider>
    </MobileDrawerContext.Provider>
  );
}
