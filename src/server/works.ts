import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ApiError, forbidden, notFound } from "@/server/api";
import { getUserContext } from "@/server/user-context";
import { access, isWriterRole, type UserContext } from "@/lib/domain/permissions";

/** Cliente Prisma o de transacción (mismo alias que `src/server/tasks.ts`). */
type DbClient = typeof prisma | Prisma.TransactionClient;

/** Lo que trae el gate de un proyecto: el ámbito (para `access`) y la etapa. */
const workAccessInclude = {
  group: { select: { id: true, name: true, publicRead: true } },
  stage: { select: { id: true, name: true, color: true } },
} satisfies Prisma.WorkInclude;

/**
 * objetivos: gate único de un proyecto para los servicios que reciben `ctx`
 * (tareas dentro de un objetivo, servicios de objetivos, MCP).
 *
 * - Sin acceso (o si no existe) responde 404 y no 403: no filtra la
 *   existencia del recurso (contrato del repo).
 * - `read`: alcanza con leer.
 * - `operate`: además de operar por ámbito exige un rol con escritura
 *   (`isWriterRole`) —un READER opera su espacio personal según `access()` y
 *   el MCP solo corta a CLIENT, así que sin este corte podría mutar por MCP
 *   (crítica B6)— y que el proyecto esté ACTIVE: un proyecto archivado
 *   responde 409 `WORK_ARCHIVED` en vez de mutarse en silencio.
 */
export async function requireWorkAccess(
  ctx: UserContext,
  workId: string,
  need: "read" | "operate",
  db: DbClient = prisma,
) {
  const work = await db.work.findUnique({ where: { id: workId }, include: workAccessInclude });
  if (!work) throw notFound();
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (need === "operate") {
    if (level !== "operate" || !isWriterRole(ctx.globalRole)) throw forbidden();
    if (work.status !== "ACTIVE") {
      throw new ApiError(
        409,
        "WORK_ARCHIVED",
        "El proyecto está archivado: desarchivalo para poder modificarlo",
      );
    }
  }
  return { work, level };
}

/**
 * Carga un proyecto exigiendo un nivel mínimo de acceso.
 *
 * Extraído de src/app/api/works/[id]/route.ts en la feature 059 para que las
 * rutas de otorgamientos de cliente usen exactamente el mismo gate y no una
 * copia que pueda divergir.
 *
 * Sin acceso responde 404 y no 403: no filtra la existencia del recurso (contrato
 * del repo).
 *
 * objetivos: delega la carga y el 404 en `requireWorkAccess` pidiendo solo
 * lectura, y el corte de operar queda acá con el contrato de siempre (403 sin
 * mirar el estado): sus llamadores operan proyectos ARCHIVADOS a propósito
 * (PATCH `status` para desarchivar, DELETE definitivo, otorgamientos de
 * cliente) y ya pasan por `requireWriter`, así que el 409 `WORK_ARCHIVED` de
 * `requireWorkAccess(..., "operate")` les rompería esos flujos.
 */
export async function getWorkWithAccess(userId: string, id: string, need: "read" | "operate") {
  const ctx = await getUserContext(userId);
  const { work, level } = await requireWorkAccess(ctx, id, "read");
  if (need === "operate" && level !== "operate") throw forbidden();
  return { work, ctx, level };
}
