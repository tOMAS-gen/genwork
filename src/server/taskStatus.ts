/**
 * CRUD de conjuntos de estado de tarea (feature 042): conjunto general de
 * organización/personal (groupId/ownerId) y override por sector (sectorId).
 * Ver data-model.md "Invariante de fork" (FR-003, SC-005): cualquier escritura
 * sobre un estado heredado, hecha desde un sector, clona el conjunto completo
 * a ese sector ANTES de aplicar el cambio — nunca muta la fila compartida.
 */

import { prisma } from "@/lib/db/client";
import { validateStatusSet, canDeleteStatus } from "@/lib/domain/taskStatus/validate";
import { conflict, notFound } from "@/server/api";
import type { Prisma, TaskStatus, TaskStatusType } from "@prisma/client";

export type StatusScope = { groupId: string } | { ownerId: string } | { sectorId: string } | { global: true };

interface ScopeColumns {
  groupId: string | null;
  ownerId: string | null;
  sectorId: string | null;
}

export function scopeColumns(scope: StatusScope): ScopeColumns {
  if ("groupId" in scope) return { groupId: scope.groupId, ownerId: null, sectorId: null };
  if ("ownerId" in scope) return { ownerId: scope.ownerId, groupId: null, sectorId: null };
  if ("sectorId" in scope) return { sectorId: scope.sectorId, groupId: null, ownerId: null };
  return { groupId: null, ownerId: null, sectorId: null };
}

function scopeWhere(scope: StatusScope): Prisma.TaskStatusWhereInput {
  return scopeColumns(scope);
}

/**
 * Conjunto aplicable a un scope, para el CRUD de administración de conjuntos. Los sectores
 * son catálogo global (feature 044): ya no pertenecen a un grupo/personal del que heredar
 * un default, así que acá un sector sin conjunto propio lista solo sus estados propios
 * (`inherited: false` siempre), sin heredar filas de otro scope para el editor.
 *
 * OJO: esto es distinto de la *resolución de estado de una tarea puntual*
 * (`resolveApplicableStatusSet` en lib/domain/tasks/statusResolution.ts), donde sí hay
 * fallback: una tarea cuyo sector EXEC no tiene override propio cae al conjunto general del
 * grupo/personal de SU `Work` (workScope) — no al ex-groupId/ownerId del Sector.
 *
 * El único "heredar y forkear" que sigue existiendo acá es el de `asSectorId` en
 * `resolveWriteTarget`, que clona el scope del *estado editado* (groupId/ownerId de
 * `TaskStatus`, ajeno al Sector) — ver `forkIfInherited`.
 */
export async function listApplicableSet(
  scope: StatusScope,
): Promise<{ inherited: boolean; statuses: TaskStatus[] }> {
  const statuses = await prisma.taskStatus.findMany({
    where: scopeWhere(scope),
    orderBy: { sortOrder: "asc" },
  });
  return { inherited: false, statuses };
}

/**
 * Si el sector no tiene conjunto propio, clona `defaultScope` completo a su scope
 * (FR-003). `defaultScope` es el scope (groupId/ownerId) del estado group/owner que se
 * está editando "como sector" — no se deriva del Sector (que ya no tiene groupId/ownerId).
 */
async function forkIfInherited(sectorId: string, defaultScope: StatusScope): Promise<void> {
  const ownCount = await prisma.taskStatus.count({ where: { sectorId } });
  if (ownCount > 0) return;

  const defaults = await prisma.taskStatus.findMany({ where: scopeWhere(defaultScope) });
  if (defaults.length === 0) return;

  const forked = await prisma.taskStatus.createManyAndReturn({
    data: defaults.map((s) => ({
      name: s.name,
      color: s.color,
      type: s.type,
      sortOrder: s.sortOrder,
      sectorId,
    })),
  });

  // Las tareas de este sector que referenciaban el conjunto heredado deben
  // pasar a apuntar a la copia recién forkeada (mismo nombre = mismo estado
  // semántico), o quedarían con un statusId ausente del nuevo conjunto propio.
  const newIdByName = new Map(forked.map((s) => [s.name, s.id]));
  const oldIds = defaults.map((s) => s.id);

  const affected = await prisma.task.findMany({
    where: {
      statusId: { in: oldIds },
      OR: [{ sectorId }, { links: { some: { type: "EXEC", sectorId } } }],
    },
    select: { id: true, statusId: true },
  });
  const oldNameById = new Map(defaults.map((s) => [s.id, s.name]));
  await Promise.all(
    affected.map((t) => {
      const name = oldNameById.get(t.statusId);
      const newId = name ? newIdByName.get(name) : undefined;
      if (!newId) return Promise.resolve();
      return prisma.task.update({ where: { id: t.id }, data: { statusId: newId } });
    }),
  );
}

/**
 * Resuelve el estado real a editar/eliminar cuando la operación se hace "como
 * sector X": si el estado es heredado (group/owner) visto desde ese sector,
 * forkea primero y devuelve la fila ya clonada en el scope del sector (mismo
 * nombre), nunca la fila compartida original.
 */
async function resolveWriteTarget(id: string, asSectorId?: string): Promise<TaskStatus> {
  const status = await prisma.taskStatus.findUnique({ where: { id } });
  if (!status) throw notFound("Estado no encontrado");
  if (!asSectorId || status.sectorId === asSectorId) return status;

  await forkIfInherited(asSectorId, scopeOfStatus(status));
  const forked = await prisma.taskStatus.findFirst({ where: { sectorId: asSectorId, name: status.name } });
  if (!forked) throw notFound("No se pudo clonar el estado heredado a este sector");
  return forked;
}

export function scopeOfStatus(status: TaskStatus): StatusScope {
  if (status.groupId) return { groupId: status.groupId };
  if (status.ownerId) return { ownerId: status.ownerId };
  if (status.sectorId) return { sectorId: status.sectorId };
  return { global: true };
}

export async function createStatus(
  scope: StatusScope,
  data: { name: string; color: string; type: TaskStatusType },
): Promise<TaskStatus> {
  // Los sectores son catálogo global (feature 044): ya no heredan un default de
  // grupo/personal, así que crear directo en su scope no forkea nada previo.
  const columns = scopeColumns(scope);
  const existing = await prisma.taskStatus.findMany({ where: columns });
  const candidate = [...existing, { id: "__new__", name: data.name, type: data.type }];
  const errors = validateStatusSet(candidate);
  if (errors.length > 0) throw conflict(errors[0].message, { errors });

  return prisma.taskStatus.create({
    data: { ...data, ...columns, sortOrder: existing.length },
  });
}

export async function updateStatus(
  id: string,
  data: Partial<{ name: string; color: string; type: TaskStatusType; sortOrder: number }>,
  asSectorId?: string,
): Promise<TaskStatus> {
  const target = await resolveWriteTarget(id, asSectorId);

  const siblings = await prisma.taskStatus.findMany({ where: scopeWhere(scopeOfStatus(target)) });
  const candidate = siblings.map((s) =>
    s.id === target.id ? { id: s.id, name: data.name ?? s.name, type: data.type ?? s.type } : s,
  );
  const errors = validateStatusSet(candidate);
  if (errors.length > 0) throw conflict(errors[0].message, { errors });

  return prisma.taskStatus.update({ where: { id: target.id }, data });
}

export async function deleteStatus(
  id: string,
  options: { asSectorId?: string; confirm?: boolean } = {},
): Promise<void> {
  const target = await resolveWriteTarget(id, options.asSectorId);

  const taskCount = await prisma.task.count({ where: { statusId: target.id } });
  const siblings = await prisma.taskStatus.findMany({ where: scopeWhere(scopeOfStatus(target)) });
  const rest = siblings.filter((s) => s.id !== target.id);
  const check = canDeleteStatus(target, rest, taskCount);

  if (!check.allowed) {
    throw conflict(check.message ?? "No se puede eliminar este estado", {
      reason: check.reason,
      affectedTasks: check.reason === "HAS_TASKS" ? taskCount : undefined,
    });
  }
  if (taskCount > 0 && !options.confirm) {
    throw conflict(`${taskCount} tarea(s) usan este estado`, { affectedTasks: taskCount });
  }

  await prisma.taskStatus.delete({ where: { id: target.id } });
}
