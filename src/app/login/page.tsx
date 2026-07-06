import type { Metadata } from "next";
import { signIn, auth, DEV_AUTH_ENABLED, DEV_USERS } from "@/server/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata: Metadata = { title: "Iniciar sesión" };

/**
 * Único punto de entrada (FR-017). El rechazo por correo no autorizado muestra
 * mensaje claro sin exponer ningún dato (FR-020).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const denied = error === "AccessDenied";

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1 className="login-brand"><BrandLogo /></h1>
        <p className="muted">Gestión de proyectos por cliente y sector</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn btn-primary" style={{ width: "100%", padding: 12 }}>
            Ingresar con Google
          </button>
        </form>

        {denied && (
          <div className="login-error" role="alert">
            Tu correo no está autorizado para ingresar. Pedile acceso al administrador del
            sistema.
          </div>
        )}

        {DEV_AUTH_ENABLED && (
          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <p className="muted">Modo prueba local (DEV_AUTH) — sin Google:</p>
            {Object.entries(DEV_USERS).map(([key, dev]) => (
              <form
                key={key}
                action={async () => {
                  "use server";
                  await signIn("dev", { redirectTo: "/", user: key });
                }}
              >
                <button className="btn" style={{ width: "100%", marginTop: 6 }}>
                  Entrar como {dev.name}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
