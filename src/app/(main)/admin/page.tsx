import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function AdminHome() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");

  return (
    <div>
      <h1>Administración</h1>
      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <Link className="card" href="/admin/access">
          <strong>Control de acceso</strong>
          <div className="muted">Quién puede ingresar: dominio corporativo o lista de correos</div>
        </Link>
        <Link className="card" href="/admin/storage">
          <strong>Almacenamiento (mini nube)</strong>
          <div className="muted">Conexión con Nextcloud y estado del aprovisionamiento</div>
        </Link>
        <Link className="card" href="/admin/users">
          <strong>Usuarios y roles</strong>
          <div className="muted">Rol Lector para pantallas/TV y grupos habilitados</div>
        </Link>
      </div>
    </div>
  );
}
