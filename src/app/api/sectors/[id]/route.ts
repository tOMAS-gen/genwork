import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conflict, notFound, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { emit } from "@/server/events";
import { isValidHex, normalizeHex } from "@/lib/domain/colors/colorConvert";

async function getSectorWithOperate(id: string) {
  const sector = await prisma.sector.findUnique({ where: { id } });
  if (!sector) throw notFound();
  await requireSuperAdmin();
  return sector;
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().refine(isValidHex, "Color inválido").nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "Debe incluir al menos name o color",
  });

/** Renombrar conserva vínculos (FR-015). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const sector = await getSectorWithOperate(id);

  const { name, color } = patchSchema.parse(await req.json());

  if (name !== undefined) {
    const dup = await prisma.sector.findFirst({
      where: {
        groupId: sector.groupId,
        ownerId: sector.ownerId,
        name: { equals: name, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (dup) throw conflict(`Ya existe un sector llamado "${name}" en este ámbito`);
  }

  const updated = await prisma.sector.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color: color === null ? null : normalizeHex(color) } : {}),
    },
  });
  return NextResponse.json(updated);
});

/**
 * Eliminar sector (FR-015): las tareas NO se eliminan, pierden la etiqueta.
 * Sin ?confirm=true responde 409 con el conteo de tareas afectadas.
 */
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  await getSectorWithOperate(id);

  const affectedTasks = await prisma.taskLink.count({ where: { sectorId: id } });
  const looseTasks = await prisma.task.count({ where: { sectorId: id } });

  const confirm = new URL(req.url).searchParams.get("confirm") === "true";
  if (!confirm) {
    throw conflict(
      `Al eliminar este sector, ${affectedTasks} vínculos de tareas se desvincularán` +
        (looseTasks > 0 ? ` y ${looseTasks} tareas sueltas se eliminarán` : ""),
      { affectedTasks, looseTasks },
    );
  }

  await prisma.sector.delete({ where: { id } }); // cascade: TaskLinks y tareas sueltas
  emit({ type: "work-changed", workId: "" });
  return new NextResponse(null, { status: 204 });
});
