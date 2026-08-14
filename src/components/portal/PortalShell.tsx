import Link from "next/link";
import { Eye } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Armazón del portal de cliente (feature 059, FR-024).
 *
 * Sin barra lateral ni navegación interna: el cliente solo tiene sus proyectos.
 * El distintivo "Vista de cliente · solo lectura" es permanente y no un aviso que
 * se descarta: el usuario tiene que entender qué está viendo sin hacer un clic
 * (Principio I).
 */
export function PortalShell({
  userName,
  logoutButton,
  children,
}: {
  userName: string;
  logoutButton: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Link href="/portal" className="portal-brand">
          genwork
        </Link>
        <span className="portal-badge">
          <Eye size={14} aria-hidden="true" />
          Vista de cliente · solo lectura
        </span>
        <div className="portal-header-right">
          <span className="portal-user">{userName}</span>
          <ThemeToggle />
          {logoutButton}
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
