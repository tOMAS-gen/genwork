"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "@/components/ui/icons";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "gw:theme";

const ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const LABEL: Record<Theme, string> = { light: "Claro", dark: "Oscuro", system: "Sistema" };
const OPTIONS: Theme[] = ["light", "dark", "system"];

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = resolveTheme(theme);
}

export function ThemeToggle({ mini = false }: { mini?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const choose = (next: Theme) => {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setOpen(false);
  };

  const ActiveIcon = ICON[theme];

  return (
    <div ref={ref} className="theme-menu-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        className={`theme-menu-trigger ${mini ? "theme-menu-trigger-mini" : ""}`}
        aria-label={`Tema: ${LABEL[theme]}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ActiveIcon size={mini ? 18 : 15} />
        {!mini && <span className="theme-menu-label">{LABEL[theme]}</span>}
      </button>

      {open && (
        <div className="theme-menu-dropdown" role="menu">
          {OPTIONS.map((opt) => {
            const Icon = ICON[opt];
            return (
              <button
                key={opt}
                type="button"
                role="menuitem"
                className={`theme-menu-item ${theme === opt ? "active" : ""}`}
                onClick={() => choose(opt)}
              >
                <Icon size={14} />
                {LABEL[opt]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
