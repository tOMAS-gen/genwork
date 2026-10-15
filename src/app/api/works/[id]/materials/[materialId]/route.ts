import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { assertQuantityAllowedForUnit, toMaterialDto } from "@/server/materials";
import { updateMaterialSchema } from "@/server/materialSchemas";
import { getWorkWithAccess } from "@/server/works";
import { emit } from "@/server/events";

export const PATCH = withApi<{
  params: Promise<{ id: string; materialId: string }>;
}>(async (req, { params }) => {
  const session = await requireWriter();
  const { id, materialId } = await params;
  await getWorkWithAccess(session.user.id, id, "operate");
  const body = updateMaterialSchema.parse(await req.json());

  const existing = await prisma.workMaterial.findFirst({
    where: { id: materialId, workId: id },
    select: {
      id: true,
      unitName: true,
      unitAbbreviation: true,
      unitAllowsDecimal: true,
    },
  });
  if (!existing) throw notFound();
  if (body.quantityRequired !== undefined) {
    assertQuantityAllowedForUnit(
      body.quantityRequired,
      existing.unitAllowsDecimal,
      existing.unitAbbreviation || existing.unitName || "esta unidad",
    );
  }

  const row = await prisma.workMaterial.update({
    where: { id: materialId },
    data: {
      ...(body.quantityRequired !== undefined ? { quantityRequired: body.quantityRequired } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
    },
  });

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(toMaterialDto(row));
});

export const DELETE = withApi<{
  params: Promise<{ id: string; materialId: string }>;
}>(async (_req, { params }) => {
  const session = await requireWriter();
  const { id, materialId } = await params;
  await getWorkWithAccess(session.user.id, id, "operate");

  const deleted = await prisma.workMaterial.deleteMany({
    where: { id: materialId, workId: id },
  });
  if (deleted.count === 0) throw notFound();

  emit({ type: "work-changed", workId: id });
  return new NextResponse(null, { status: 204 });
});
