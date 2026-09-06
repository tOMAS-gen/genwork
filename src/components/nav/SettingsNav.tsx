"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Secciones de la cuenta: las ve cualquier usuario. */
const ACCOUNT_ITEMS = [["/settings", "Mi cuenta"]] as const;

/** Secciones de todo el sistema: sólo para SUPERADMIN (guardadas por admin/layout). */
const SYSTEM_ITEMS = [
  ["/admin", "Resumen"],
  ["/admin/access", "Acceso"],
  ["/admin/users", "Usuarios"],
  ["/admin/clients", "Clientes"],
  ["/admin/labels", "Etiquetas"],
  ["/admin/stages", "Producción"],
  ["/admin/task-statuses", "Estados de tarea"],
  ["/admin/storage", "Almacenamiento"],
  ["/admin/reminders", "Recordatorios"],
  ["/admin/errors", "Errores"],
  ["/admin/mcp", "Asistentes / MCP"],
] as const;

/** Índices de sección: nunca se marcan activos por prefijo, o taparían a sus hijas. */
const INDEX_HREFS = new Set(["/settings", "/admin"]);

/**
 * Barra única de configuración: mezcla las secciones de la cuenta con las del
 * sistema para que el usuario vea un solo lugar de configuración, aunque las
 * páginas vivan bajo /settings y /admin.
 */
export function SettingsNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const items = isSuperAdmin ? [...ACCOUNT_ITEMS, ...SYSTEM_ITEMS] : ACCOUNT_ITEMS;

  return (
    <nav className="section-tabs" aria-label="Secciones de configuración">
      {items.map(([href, label]) => {
        const active =
          pathname === href ||
          (!INDEX_HREFS.has(href) && pathname.startsWith(`${href}/`));

        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
