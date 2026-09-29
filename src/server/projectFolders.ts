import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, forbidden, notFound } from "@/server/api";
import { emit } from "@/server/events";
import { access, isWriterRole, type UserContext } from "@/lib/domain/permissions";
import { enqueue } from "@/lib/storage/queue";
import { computeProjectFolderPath, folderSegment } from "@/lib/storage/paths";
import { storageRootName } from "@/lib/storage/root";

/**
 * Feature 063: carpetas de proyectos. Agrupan proyectos del mismo cliente,
 * organización o tipo de trabajo dentro de un ámbito (Grupo o Personal). En la
 * nube son un nivel intermedio: /GENWORK_<EMPRESA>/<ÁMBITO>/<CARPETA>/<PROYECTO>.
 *
 * Servicio compartido por la API web y las herramientas MCP (Principio VIII).
 */

type DbClient = typeof prisma | Prisma.TransactionClient;

export type ProjectFolderDto = {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  ownerId: string | null;
  /** Proyectos (no plantillas) activos y archivados dentro de la carpeta. */
  workCount: number;
};

const folderInclude = {
  group: { select: { id: true, name: true, publicRead: true } },
  _count: { select: { works: { where: { isTemplate: false } } } },
} satisfies Prisma.ProjectFolderInclude;

type FolderWithInclude = Prisma.ProjectFolderGetPayload<{ include: typeof folderInclude }>;

function toDto(f: FolderWithInclude): ProjectFolderDto {
  return {
    id: f.id,
    name: f.name,
    groupId: f.groupId,
    groupName: f.group?.name ?? null,
    ownerId: f.ownerId,
    workCount: f._count.works,
  };
}

function byName(a: ProjectFolderDto, b: ProjectFolderDto) {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}

/** Ámbito de una carpeta o proyecto: grupo, o personal de `ownerId`. */
interface FolderScope {
  groupId: string | null;
  ownerId: string | null;
}

function scopeWhere(scope: FolderScope): Prisma.ProjectFolderWhereInput {
  return scope.groupId ? { groupId: scope.groupId } : { ownerId: scope.ownerId, groupId: null };
}

function requireOperate(ctx: UserContext, scope: FolderScope & { groupPublicRead?: boolean }) {
  if (!isWriterRole(ctx.globalRole) || access(ctx, scope) !== "operate") {
    throw forbidden("No podés administrar las carpetas de este ámbito");
  }
}

/**
 * Nombre único por ámbito comparando el nombre de carpeta en la nube: "Acme" y
 * "ACME" irían a la misma carpeta, así que se rechazan igual que un duplicado.
 */
async function assertUniqueName(scope: FolderScope, name: string, exceptId?: string) {
  const segment = folderSegment(name);
  if (!segment) throw badRequest("El nombre de la carpeta no es válido");
  const siblings = await prisma.projectFolder.findMany({
    where: { ...scopeWhere(scope), ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
  const dup = siblings.find((s) => folderSegment(s.name) === segment);
  if (dup) throw conflict(`Ya existe una carpeta llamada "${dup.name}" en este ámbito`);
}

/**
 * Carpetas visibles para `ctx`. Sin filtro: todas las de los ámbitos que ve
 * (para el filtro del dashboard). Con `groupId` o `personal`: solo esa.
 */
export async function listProjectFolders(
  ctx: UserContext,
  filter: { groupId?: string | null; personal?: boolean } = {},
): Promise<ProjectFolderDto[]> {
  let where: Prisma.ProjectFolderWhereInput;
  if (filter.personal) {
    where = { ownerId: ctx.id, groupId: null };
  } else if (filter.groupId) {
    where = { groupId: filter.groupId };
  } else {
    where = { OR: [{ ownerId: ctx.id, groupId: null }, { groupId: { not: null } }] };
  }
  const folders = await prisma.projectFolder.findMany({ where, include: folderInclude });
  return folders
    .filter(
      (f) =>
        access(ctx, {
          groupId: f.groupId,
          ownerId: f.ownerId,
          groupPublicRead: f.group?.publicRead ?? false,
        }) !== "none",
    )
    .map(toDto)
    .sort(byName);
}

export async function createProjectFolder(
  ctx: UserContext,
  input: { name: string; groupId?: string | null },
): Promise<ProjectFolderDto> {
  const name = input.name.trim();
  const scope: FolderScope = input.groupId
    ? { groupId: input.groupId, ownerId: null }
    : { groupId: null, ownerId: ctx.id };
  requireOperate(ctx, scope);
  await assertUniqueName(scope, name);

  const folder = await prisma.projectFolder.create({
    data: { name, ...scope },
    include: folderInclude,
  });
  return toDto(folder);
}

async function loadForOperate(ctx: UserContext, id: string) {
  const folder = await prisma.projectFolder.findUnique({ where: { id }, include: folderInclude });
  if (!folder) throw notFound();
  const level = access(ctx, {
    groupId: folder.groupId,
    ownerId: folder.ownerId,
    groupPublicRead: folder.group?.publicRead ?? false,
  });
  // Sin acceso: 404 y no 403, no se filtra la existencia (contrato del repo).
  if (level === "none") throw notFound();
  requireOperate(ctx, folder);
  return folder;
}

/**
 * Encola el movimiento de la carpeta en la nube de un proyecto al cambiar de
 * carpeta de proyectos (`folderName` null = directo en el ámbito). No-op si el
 * proyecto no tiene carpeta en la nube o la ruta no cambia.
 */
export async function enqueueProjectFolderMove(
  work: { id: string; nextcloudFolderPath: string | null },
  folderName: string | null,
  fromPath: string | null = work.nextcloudFolderPath,
): Promise<string | null> {
  if (!fromPath) return fromPath;
  const toPath = computeProjectFolderPath(fromPath, folderName, storageRootName());
  if (toPath === fromPath) return fromPath;
  await enqueue({ kind: "MOVE_WORK_FOLDER", workId: work.id, fromPath, toPath });
  return toPath;
}

/** Renombra la carpeta y mueve en la nube las carpetas de sus proyectos. */
export async function renameProjectFolder(
  ctx: UserContext,
  id: string,
  rawName: string,
): Promise<ProjectFolderDto> {
  const folder = await loadForOperate(ctx, id);
  const name = rawName.trim();
  if (name === folder.name) return toDto(folder);
  await assertUniqueName(folder, name, id);

  const updated = await prisma.projectFolder.update({
    where: { id },
    data: { name },
    include: folderInclude,
  });
  if (folderSegment(name) !== folderSegment(folder.name)) {
    const works = await prisma.work.findMany({
      where: { projectFolderId: id, nextcloudFolderPath: { not: null } },
      select: { id: true, nextcloudFolderPath: true },
    });
    for (const w of works) await enqueueProjectFolderMove(w, name);
  }
  emitWorks(await workIdsIn(id));
  return toDto(updated);
}

/**
 * Borra la carpeta: sus proyectos quedan sin carpeta (nunca se borran) y en la
 * nube vuelven a colgar directo de su ámbito.
 */
export async function deleteProjectFolder(ctx: UserContext, id: string): Promise<void> {
  await loadForOperate(ctx, id);
  const works = await prisma.work.findMany({
    where: { projectFolderId: id },
    select: { id: true, nextcloudFolderPath: true },
  });
  await prisma.projectFolder.delete({ where: { id } });
  for (const w of works) await enqueueProjectFolderMove(w, null);
  emitWorks(works.map((w) => w.id));
}

/**
 * Valida que un proyecto pueda ir a la carpeta `folderId`: la carpeta existe y
 * es del MISMO ámbito que el proyecto (la ruta en la nube lo exige), y el
 * proyecto no es una plantilla. Devuelve la carpeta (o null para "sin carpeta").
 */
export async function resolveFolderForWork(
  work: FolderScope & { isTemplate: boolean },
  folderId: string | null,
  db: DbClient = prisma,
): Promise<{ id: string; name: string } | null> {
  if (folderId === null) return null;
  if (work.isTemplate) throw badRequest("Una plantilla no puede estar en una carpeta");
  const folder = await db.projectFolder.findUnique({
    where: { id: folderId },
    select: { id: true, name: true, groupId: true, ownerId: true },
  });
  const sameScope = work.groupId
    ? folder?.groupId === work.groupId
    : folder !== null && folder.groupId === null && folder.ownerId === work.ownerId;
  if (!folder || !sameScope) {
    throw badRequest("La carpeta no existe o no pertenece al ámbito del proyecto");
  }
  return { id: folder.id, name: folder.name };
}

async function workIdsIn(folderId: string) {
  const works = await prisma.work.findMany({ where: { projectFolderId: folderId }, select: { id: true } });
  return works.map((w) => w.id);
}

function emitWorks(workIds: string[]) {
  for (const workId of workIds) emit({ type: "work-changed", workId });
}
