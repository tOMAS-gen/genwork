import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { appBaseUrl } from "@/lib/reminders/link";
import { buildConnectPayload, isLocalOrigin, systemName } from "@/lib/mobile/connect";
import { renderQrSvg } from "@/lib/mobile/qr";

export const metadata: Metadata = { title: "App móvil · Configuración" };

/**
 * App móvil: muestra el QR con la dirección de este servidor para vincular el
 * teléfono. El QR NO lleva credenciales: la app solo aprende a qué servidor
 * conectarse y después pide el login. La dirección sale de la config del
 * servidor (misma fuente que "Vincular con Claude"), no del navegador.
 */
export default async function MobileLinkPage() {
  const origin = appBaseUrl();
  const name = systemName(origin, process.env.SYSTEM_NAME);
  const svg = await renderQrSvg(buildConnectPayload(origin));

  return (
    <div className="page-stack">
      <PageHeader
        title="App móvil"
        description="Escaneá este código con la app de Genwork para conectarla a este sistema."
        icon="settings"
      />

      {isLocalOrigin(origin) && (
        <p role="alert" className="muted" style={{ fontSize: "var(--text-sm)" }}>
          La dirección configurada ({origin}) es local: un teléfono no podrá alcanzarla. Definí
          NEXTAUTH_URL con la dirección pública del sistema.
        </p>
      )}

      <div
        role="img"
        aria-label={`Código QR para vincular la app móvil con ${name}`}
        style={{ background: "#fff", padding: 16, borderRadius: 8, width: "fit-content" }}
      >
        <div style={{ width: 240, height: 240 }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      <div>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>Dirección de este sistema</p>
        <p style={{ fontFamily: "var(--font-mono, monospace)" }}>{origin}</p>
        <CopyButton value={origin} label="dirección del sistema" />
      </div>

      <ol className="muted" style={{ fontSize: "var(--text-sm)", paddingLeft: 20 }}>
        <li>Instalá la app de Genwork en el teléfono.</li>
        <li>En el primer inicio, elegí «Escanear QR» y apuntá a este código.</li>
        <li>Ingresá con tu cuenta de Google. Para sumar otro sistema, usá «Agregar servidor» en la app.</li>
      </ol>
    </div>
  );
}
