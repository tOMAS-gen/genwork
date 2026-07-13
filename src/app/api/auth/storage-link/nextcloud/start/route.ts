import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/**
 * Inicia el Login Flow v2 de Nextcloud (feature 051, R1). Pide a Nextcloud un
 * `login` (URL a la que el usuario va para autorizar con SU cuenta) y un
 * `poll.token/endpoint`. Persiste el estado efímero (token → endpoint + userId)
 * en `NextcloudLoginFlow` para que el poll pueda recuperarlo y verificar que es
 * el mismo usuario. Devuelve `{ loginUrl, pollToken }` — las credenciales del
 * usuario nunca pasan por acá; se obtienen en el poll y se guardan cifradas.
 */

/** Resuelve la URL base de Nextcloud igual que el resto del módulo de storage. */
async function resolveNextcloudUrl(): Promise<string | null> {
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const stored = config?.storageConfig as { url?: string } | null;
  const url = (stored?.url ?? process.env.NEXTCLOUD_URL ?? "").replace(/\/$/, "");
  return url || null;
}

const storageUnavailable = () =>
  NextResponse.json(
    { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
    { status: 503 },
  );

export const POST = withApi(async () => {
  const session = await requireSession();

  const baseUrl = await resolveNextcloudUrl();
  if (!baseUrl) return storageUnavailable();

  let data: { poll?: { token?: string; endpoint?: string }; login?: string };
  try {
    const res = await fetch(`${baseUrl}/index.php/login/v2`, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return storageUnavailable();
    data = await res.json();
  } catch {
    return storageUnavailable();
  }

  const token = data.poll?.token;
  const endpoint = data.poll?.endpoint;
  const loginUrl = data.login;
  if (!token || !endpoint || !loginUrl) return storageUnavailable();

  // Persistimos el estado efímero del flujo (upsert por si el token se repite).
  await prisma.nextcloudLoginFlow.upsert({
    where: { token },
    create: { token, pollEndpoint: endpoint, userId: session.user.id },
    update: { pollEndpoint: endpoint, userId: session.user.id, createdAt: new Date() },
  });

  return NextResponse.json({ loginUrl, pollToken: token });
});
