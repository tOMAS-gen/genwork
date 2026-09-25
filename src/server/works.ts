import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ApiError, badRequest, conflict, forbidden, notFound } from "@/server/api";
import { emit } from "@/server/events";
import { getUserContext } from "@/server/user-context";
import { access, isWriterRole, type UserContext } from "@/lib/domain/permissions";
import { cloneTaskTree, insertTemplateAsObjectiveTx } from "@/lib/domain/works/cloneFromTemplate";

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

/** Mensaje único de plantilla inválida: no revela si existe una plantilla que no se puede leer. */
const TEMPLATE_UNAVAILABLE = "La plantilla seleccionada no existe o no está activa";

/**
 * objetivos: carga una plantilla que `ctx` puede LEER, para copiarla. Si no
 * existe, no es plantilla, no está activa o el usuario no la ve, responde 400
 * con el mismo mensaje en todos los casos (no filtra la existencia). Antes
 * `POST /api/works` con `cloneFromId` no controlaba acceso: se podía copiar
 * una plantilla de otro grupo con solo conocer su id.
 */
export async function requireReadableTemplate(ctx: UserContext, templateId: string, db: DbClient = prisma) {
  const template = await db.work.findUnique({ where: { id: templateId }, include: workAccessInclude });
  if (!template || !template.isTemplate || template.status !== "ACTIVE") throw badRequest(TEMPLATE_UNAVAILABLE);
  const level = access(ctx, {
    groupId: template.groupId,
    ownerId: template.ownerId,
    groupPublicRead: template.group?.publicRead ?? false,
  });
  if (level === "none") throw badRequest(TEMPLATE_UNAVAILABLE);
  return template;
}

export interface CreateWorkInput {
  name: string;
  description?: string | null;
  /** Sin grupo: espacio personal de `ctx`. */
  groupId?: string | null;
  dueDate?: Date | null;
  /** Crea una plantilla (contenedor de tareas, nunca con objetivos). */
  isTemplate?: boolean;
  /**
   * Plantilla a copiar. En un proyecto se inserta como UN objetivo; en una
   * plantilla nueva sus tareas pasan como generales (una plantilla no tiene
   * objetivos).
   */
  templateId?: string;
  /** Título del objetivo insertado; por defecto, el nombre de la plantilla. */
  objectiveTitle?: string;
}

/**
 * objetivos: alta de proyecto (o plantilla) compartida por `POST /api/works`
 * y la herramienta MCP `work.create` (antes duplicada en los dos lados).
 *
 * - Exige rol con escritura y, con grupo, operar ese grupo (403).
 * - Nombre único por ámbito (409).
 * - Con `templateId`: plantilla legible (`requireReadableTemplate`), y el
 *   proyecto nace con la plantilla insertada como objetivo en la MISMA
 *   transacción (si el clonado falla, no queda un proyecto a medias).
 * - Emite `work-changed`.
 */
export async function createWork(ctx: UserContext, input: CreateWorkInput) {
  if (!isWriterRole(ctx.globalRole)) throw forbidden();
  const { name, groupId, templateId } = input;
  const isTemplate = input.isTemplate ?? false;

  const scope = groupId
    ? { groupId, ownerId: null as string | null }
    : { groupId: null as string | null, ownerId: ctx.id };

  if (groupId && access(ctx, { groupId, ownerId: null }) !== "operate") {
    throw forbidden("No sos miembro de ese grupo");
  }

  const dup = await prisma.work.findFirst({ where: { ...scope, name } });
  if (dup) throw conflict(`Ya existe un proyecto llamado "${name}" en este ámbito`);

  const template = templateId ? await requireReadableTemplate(ctx, templateId) : null;

  const result = await prisma.$transaction(
    async (tx) => {
      const work = await tx.work.create({
        data: {
          name,
          description: input.description || null,
          ...scope,
          createdById: ctx.id,
          isTemplate,
          dueDate: input.dueDate ?? null,
          doc: { create: {} },
        },
        include: { group: { select: { id: true, name: true, publicRead: true } } },
      });
      if (!template) return { work, objective: null, copiedTasks: 0 };

      if (isTemplate) {
        // Plantilla desde plantilla: sin objetivos, las tareas quedan generales.
        const { copiedTasks } = await cloneTaskTree(tx, {
          sourceWhere: { workId: template.id },
          destWorkId: work.id,
          destObjectiveId: null,
          actorId: ctx.id,
        });
        return { work, objective: null, copiedTasks };
      }

      const { objective, copiedTasks } = await insertTemplateAsObjectiveTx(tx, {
        workId: work.id,
        template,
        title: input.objectiveTitle,
        actorId: ctx.id,
      });
      return { work, objective, copiedTasks };
    },
    { timeout: 20_000 },
  );

  emit({ type: "work-changed", workId: result.work.id });
  return {
    ...result,
    template: template ? { id: template.id, name: template.name } : null,
  };
}
