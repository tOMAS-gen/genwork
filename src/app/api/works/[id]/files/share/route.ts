import { NextResponse } from "next/server";
import type { ShareMode } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ApiError, badRequest, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { assertWorkAccess, confineWorkPath } from "@/lib/storage/access-check";
import { getStorageProvider } from "@/lib/storage";
import { StorageIdentityMissingError } from "@/lib/storage/identity";
import { encryptSecret } from "@/lib/crypto";

interface ShareBody {
  path?: unknown;
  mode?: unknown;
  password?: unknown;
  expiresAt?: unknown;
  targetUserId?: unknown;
  targetSectorId?: unknown;
}

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const { work } = await assertWorkAccess(session.user.id, id, "read");

  if (!work.nextcloudFolderPath) {
    throw new ApiError(404, "NOT_FOUND", "Sin carpeta de archivos configurada");
  }

  const { searchParams } = new URL(req.url);
  if (!searchParams.has("path")) {
    throw badRequest("Falta el parámetro path");
  }

  const fullPath = confineWorkPath(work.nextcloudFolderPath, searchParams.get("path"));

  const shares = await prisma.fileShare.findMany({
    where: {
      workId: work.id,
      path: fullPath,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workId: true,
      path: true,
      mode: true,
      createdById: true,
      targetUserId: true,
      targetSectorId: true,
      providerShareId: true,
      linkUrl: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
      // Nombre/email del destinatario interno, solo para mostrar "a quién" en el
      // modal de Compartir (T034) — no forma parte estricta del contrato de
      // `FileShare`, es información adicional no-disruptiva (campos extra).
      targetUser: { select: { name: true, email: true } },
      targetSector: { select: { name: true } },
    },
  });

  return NextResponse.json({
    shares: shares.map(({ targetUser, targetSector, ...share }) => ({
      ...share,
      targetUserName: targetUser?.name ?? targetUser?.email ?? undefined,
      targetSectorName: targetSector?.name ?? undefined,
    })),
  });
});

/**
 * FR-004/FR-010: crea un acceso compartido (link público o alta interna de un
 * usuario/sección de genwork) sobre un archivo o carpeta puntual del trabajo.
 * FR-005: se autoriza con el mismo motor de permisos que el resto del dominio
 * ("operate"), ANTES de tocar el proveedor de almacenamiento.
 * FR-007: el `path` recibido se confina dentro de la carpeta raíz del trabajo.
 * FR-008: si el proveedor activo no implementa `share`, responde 501
 * `STORAGE_OP_NOT_SUPPORTED` en vez de fallar en silencio.
 *
 * Contrato: specs/051-gestion-archivos-nube/contracts/files-crud-and-identity.md
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const { work } = await assertWorkAccess(session.user.id, id, "operate");

  let body: ShareBody;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Body inválido");
  }

  const mode = body.mode as ShareMode;
  if (mode !== "LINK" && mode !== "INTERNAL") {
    throw new ApiError(400, "INVALID_SHARE", 'El modo debe ser "LINK" o "INTERNAL"');
  }

  const clientPath = typeof body.path === "string" ? body.path : undefined;

  if (!work.nextcloudFolderPath) {
    throw new ApiError(409, "CONFLICT", "La carpeta del proyecto todavía no está lista; reintentá en unos segundos");
  }

  const fullPath = confineWorkPath(work.nextcloudFolderPath, clientPath);

  const targetUserId = typeof body.targetUserId === "string" && body.targetUserId ? body.targetUserId : undefined;
  const targetSectorId =
    typeof body.targetSectorId === "string" && body.targetSectorId ? body.targetSectorId : undefined;

  if (mode === "INTERNAL") {
    const hasUser = !!targetUserId;
    const hasSector = !!targetSectorId;
    if (hasUser === hasSector) {
      // ambos o ninguno
      throw new ApiError(
        400,
        "INVALID_SHARE",
        "Compartir con INTERNAL requiere targetUserId o targetSectorId (no ambos, no ninguno)",
      );
    }
  }

  const password = typeof body.password === "string" && body.password ? body.password : undefined;

  let expiresAt: Date | undefined;
  if (typeof body.expiresAt === "string" && body.expiresAt) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, "INVALID_SHARE", "expiresAt inválido");
    }
    expiresAt = parsed;
  }

  let storage;
  try {
    storage = await getStorageProvider(session.user.id);
  } catch (err) {
    if (err instanceof StorageIdentityMissingError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, linkUrl: "/settings" } },
        { status: 424 },
      );
    }
    throw err;
  }

  if (!storage) {
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Almacenamiento no configurado" } },
      { status: 503 },
    );
  }

  if (typeof storage.share !== "function") {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_OP_NOT_SUPPORTED",
          message: "El proveedor de almacenamiento activo no soporta compartir",
        },
      },
      { status: 501 },
    );
  }

  // INTERNAL con targetUserId: el proveedor necesita el identificador propio del
  // destinatario en ese proveedor (nextcloudLoginName o email de Google), no un
  // id interno de genwork. Se busca su StorageIdentity vigente para el proveedor
  // activo. Si el destinatario nunca vinculó su cuenta, no hay forma de darle
  // acceso puntual en el proveedor → 400 `TARGET_STORAGE_IDENTITY_MISSING` (código
  // propio, no está en el contrato original).
  let targetIdentity: string | undefined;
  if (mode === "INTERNAL" && targetUserId) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new ApiError(400, "INVALID_SHARE", "El usuario destinatario no existe");
    }

    const accessConfig = await prisma.accessConfig.findUnique({ where: { id: 1 } });
    const activeProvider = accessConfig?.storageProvider ?? "NEXTCLOUD";

    const targetIdentityRow = await prisma.storageIdentity.findFirst({
      where: { userId: targetUserId, provider: activeProvider, revokedAt: null },
    });

    if (!targetIdentityRow) {
      throw new ApiError(
        400,
        "TARGET_STORAGE_IDENTITY_MISSING",
        "El usuario destinatario no vinculó su cuenta de almacenamiento",
      );
    }

    targetIdentity =
      activeProvider === "GDRIVE" ? targetUser.email : (targetIdentityRow.nextcloudLoginName ?? undefined);

    if (!targetIdentity) {
      throw new ApiError(
        400,
        "TARGET_STORAGE_IDENTITY_MISSING",
        "El usuario destinatario no vinculó su cuenta de almacenamiento",
      );
    }
  }

  // INTERNAL con targetSectorId: StorageIdentity está acotado a usuarios
  // individuales en esta versión (ver data-model.md), no hay una identidad de
  // proveedor propia de un sector. Se verifica que el sector exista (para no
  // dejar un FileShare huérfano) y se llama al proveedor sin `targetIdentity`;
  // si el proveedor activo no soporta un share "interno" sin destinatario
  // puntual, el catch de abajo lo traduce a 503 STORAGE_UNAVAILABLE.
  if (mode === "INTERNAL" && targetSectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: targetSectorId } });
    if (!sector) {
      throw new ApiError(400, "INVALID_SHARE", "El sector destinatario no existe");
    }
  }

  let result: { providerShareId: string; linkUrl?: string };
  try {
    result = await storage.share({ path: fullPath, mode, password, expiresAt, targetIdentity });
  } catch (err) {
    console.error("share error:", err);
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
      { status: 503 },
    );
  }

  const fileShare = await prisma.fileShare.create({
    data: {
      workId: work.id,
      path: fullPath,
      mode,
      createdById: session.user.id,
      targetUserId: targetUserId ?? null,
      targetSectorId: targetSectorId ?? null,
      providerShareId: result.providerShareId,
      linkUrl: result.linkUrl ?? null,
      linkPasswordEnc: mode === "LINK" && password ? encryptSecret(password) : null,
      expiresAt: expiresAt ?? null,
    },
  });

  return NextResponse.json(
    {
      id: fileShare.id,
      mode: fileShare.mode,
      linkUrl: fileShare.linkUrl ?? undefined,
      expiresAt: fileShare.expiresAt ?? undefined,
      targetUserId: fileShare.targetUserId ?? undefined,
      targetSectorId: fileShare.targetSectorId ?? undefined,
    },
    { status: 201 },
  );
});
