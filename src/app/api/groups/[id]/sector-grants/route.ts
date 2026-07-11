import { z } from "zod";
import { notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";

const schema = z.object({
  email: z.string().email(),
  sectorId: z.string().uuid(),
});

/**
 * TODO(T024 — feature 044, gap detectado en implementación): endpoint obsoleto.
 * Antes administraba SectorGrant para "los sectores del grupo :id" (los ADMIN del
 * grupo gestionaban el acceso de sus propios sectores). Desde que el sector pasó a
 * ser catálogo global sin groupId/ownerId (ver prisma/schema.prisma Sector,
 * migración 20260706160007_labels_global_scope y el nuevo accessSector en
 * src/lib/domain/permissions/index.ts), ya no existe el concepto de "sectores de
 * este grupo": cualquier sector puede ser referenciado por cualquier grupo. La
 * administración de SectorGrant ahora es exclusivamente global vía la tool MCP
 * `admin.sectorGrant.set` (src/lib/mcp/tools/admin.ts), reservada a SUPERADMIN.
 * No se reintrodujo un scope de grupo inventado: se deja el endpoint devolviendo
 * 404 (no existen "sectores de este grupo" que administrar) para ser honestos
 * sobre la limitación en lugar de fingir que sigue funcionando con semántica de
 * grupo que ya no existe. `server/api.ts` no tiene un helper 410 Gone y agregar
 * uno queda fuera del alcance de este cambio puntual.
 */
const DEPRECATED_MSG =
  "Los sectores ya no pertenecen a un grupo: administrá el acceso vía admin.sectorGrant.set (MCP, solo SUPERADMIN).";

export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req) => {
  await requireWriter();
  schema.parse(await req.json());
  throw notFound(DEPRECATED_MSG);
});

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req) => {
  await requireWriter();
  schema.parse(await req.json());
  throw notFound(DEPRECATED_MSG);
});
