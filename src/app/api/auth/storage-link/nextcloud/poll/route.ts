import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { ApiError, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { encryptSecret } from "@/lib/crypto";

/**
 * Poll del Login Flow v2 de Nextcloud (feature 051, R1). Recupera el flujo
 * efímero por `pollToken`, verifica que sea del usuario de la sesión y hace POST
 * al endpoint de poll de Nextcloud:
 *  - 404 → el usuario todavía no autorizó → `{ status: "PENDING" }`.
 *  - 200 `{ server, loginName, appPassword }` → cifra el appPassword, upsert de
 *    `StorageIdentity`, limpia el estado efímero → `{ status: "LINKED" }`.
 * Si el token no existe/es de otro usuario/expiró → 410 `EXPIRED`.
 */

// Nextcloud invalida el token de login v2 pasado un tiempo; tratamos como
// expirado cualquier flujo con más de 20 min de antigüedad.
const FLOW_TTL_MS = 20 * 60 * 1000;

const bodySchema = z.object({ pollToken: z.string().min(1) });

const expired = () => new ApiError(410, "EXPIRED", "El flujo de vinculación expiró, reintentá");

export const POST = withApi(async (req) => {
  const session = await requireSession();
  const { pollToken } = bodySchema.parse(await req.json());

  const flow = await prisma.nextcloudLoginFlow.findUnique({ where: { token: pollToken } });
  if (!flow || flow.userId !== session.user.id) throw expired();

  if (Date.now() - flow.createdAt.getTime() > FLOW_TTL_MS) {
    await prisma.nextcloudLoginFlow.delete({ where: { token: pollToken } }).catch(() => {});
    throw expired();
  }

  let res: Response;
  try {
    res = await fetch(flow.pollEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: pollToken }).toString(),
      cache: "no-store",
    });
  } catch {
    // Nextcloud caído durante el poll: no es expiración, que el cliente reintente.
    return NextResponse.json({ status: "PENDING" });
  }

  // Mientras el usuario no autoriza, Nextcloud responde 404.
  if (res.status === 404) return NextResponse.json({ status: "PENDING" });
  if (!res.ok) throw expired();

  const creds = (await res.json()) as {
    server?: string;
    loginName?: string;
    appPassword?: string;
  };
  if (!creds.loginName || !creds.appPassword) throw expired();

  await prisma.storageIdentity.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "NEXTCLOUD" } },
    create: {
      userId: session.user.id,
      provider: "NEXTCLOUD",
      nextcloudLoginName: creds.loginName,
      nextcloudAppPasswordEnc: encryptSecret(creds.appPassword),
      linkedAt: new Date(),
      revokedAt: null,
    },
    update: {
      nextcloudLoginName: creds.loginName,
      nextcloudAppPasswordEnc: encryptSecret(creds.appPassword),
      linkedAt: new Date(),
      revokedAt: null,
    },
  });

  await prisma.nextcloudLoginFlow.delete({ where: { token: pollToken } }).catch(() => {});

  return NextResponse.json({ status: "LINKED" });
});
