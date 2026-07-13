import { NextResponse } from "next/server";
import { ApiError, badRequest, conflict, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { assertWorkAccess, confineWorkPath } from "@/lib/storage/access-check";
import { getStorageProvider } from "@/lib/storage";
import { StorageIdentityMissingError } from "@/lib/storage/identity";

/**
 * FR-001: crea una carpeta dentro de la carpeta de archivos de un trabajo.
 * FR-005: se autoriza con el mismo motor de permisos que el resto del dominio,
 * ANTES de tocar el proveedor de almacenamiento (assertWorkAccess "operate").
 * FR-007: el `path` recibido se confina dentro de la carpeta raíz del trabajo.
 * FR-008: si el proveedor activo no implementa `createFolder`, responde 501
 * `STORAGE_OP_NOT_SUPPORTED` en vez de fallar en silencio.
 *
 * Contrato: specs/051-gestion-archivos-nube/contracts/files-crud-and-identity.md
 */
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const { work } = await assertWorkAccess(session.user.id, id, "operate");

  let body: { path?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    throw badRequest("Body inválido");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    throw new ApiError(400, "INVALID_NAME", "El nombre de la carpeta no puede estar vacío");
  }

  const clientPath = typeof body.path === "string" ? body.path : undefined;

  if (!work.nextcloudFolderPath) {
    throw conflict("La carpeta del proyecto todavía no está lista; reintentá en unos segundos");
  }

  const folderPath = confineWorkPath(work.nextcloudFolderPath, clientPath);

  let storage;
  try {
    storage = await getStorageProvider(session.user.id);
  } catch (err) {
    if (err instanceof StorageIdentityMissingError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            linkUrl: "/settings",
          },
        },
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

  if (typeof storage.createFolder !== "function") {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_OP_NOT_SUPPORTED",
          message: "El proveedor de almacenamiento activo no soporta crear carpetas",
        },
      },
      { status: 501 },
    );
  }

  try {
    const { path } = await storage.createFolder({ folderPath, name });
    return NextResponse.json({ path }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === "ALREADY_EXISTS") {
      throw new ApiError(409, "ALREADY_EXISTS", (err as Error).message);
    }
    if (code === "INVALID_NAME") {
      throw new ApiError(400, "INVALID_NAME", (err as Error).message);
    }
    console.error("createFolder error:", err);
    return NextResponse.json(
      { error: { code: "STORAGE_UNAVAILABLE", message: "Nextcloud no disponible" } },
      { status: 503 },
    );
  }
});
