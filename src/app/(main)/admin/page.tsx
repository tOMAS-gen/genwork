import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Shield, HardDrive, Users, Tag, Layers, AlertCircle } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminHome() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");

  return (
    <div className="sheet">
      <h1 className="sheet-title" style={{ marginBottom: "var(--space-4)" }}>Administración</h1>
      <div className="project-grid">
        <Link className="project-card" href="/admin/access">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Shield size={20} />
            <div>
              <div><strong>Control de acceso</strong></div>
              <span className="muted">Quién puede ingresar: dominio corporativo o lista de correos</span>
            </div>
          </div>
        </Link>
        <Link className="project-card" href="/admin/storage">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <HardDrive size={20} />
            <div>
              <div><strong>Almacenamiento (mini nube)</strong></div>
              <span className="muted">Conexión con Nextcloud y estado del aprovisionamiento</span>
            </div>
          </div>
        </Link>
        <Link className="project-card" href="/admin/users">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Users size={20} />
            <div>
              <div><strong>Usuarios y roles</strong></div>
              <span className="muted">Rol Lector para pantallas/TV y grupos habilitados</span>
            </div>
          </div>
        </Link>
        <Link className="project-card" href="/admin/labels">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Tag size={20} />
            <div>
              <div><strong>Etiquetas</strong></div>
              <span className="muted">Claves y valores de etiquetas para clasificar proyectos</span>
            </div>
          </div>
        </Link>
        <Link className="project-card" href="/admin/stages">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Layers size={20} />
            <div>
              <div><strong>Estados de producción</strong></div>
              <span className="muted">Configurar las etapas de producción para los proyectos del grupo</span>
            </div>
          </div>
        </Link>
        <Link className="project-card" href="/admin/errors">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <AlertCircle size={20} />
            <div>
              <div><strong>Errores</strong></div>
              <span className="muted">Errores capturados automáticamente, listos para revisar y corregir</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
