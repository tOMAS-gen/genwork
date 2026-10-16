import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { conflict, withApi } from "@/server/api";
import { requireInternal, requireWriter } from "@/server/guards";
import { getGenstockContext, getGenstockItem } from "@/server/genstock";
import { assertQuantityAllowedForUnit, toMaterialDto, unitSnapshot } from "@/server/materials";
import { createMaterialSchema } from "@/server/materialSchemas";
import { getWorkWithAccess } from "@/server/works";
import { emit } from "@/server/events";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const session = await requireInternal();
  const { id } = await params;
  await getWorkWithAccess(session.user.id, id, "read");

  const rows = await prisma.workMaterial.findMany({
    where: { workId: id },
    orderBy: [{ productName: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows.map(toMaterialDto));
});

export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;
  await getWorkWithAccess(session.user.id, id, "operate");
  const body = createMaterialSchema.parse(await req.json());

  const existing = await prisma.workMaterial.findFirst({
    where: { workId: id, genstockProductId: body.productId },
    select: { id: true },
  });
  if (existing) {
    throw conflict("Este material ya está asignado al proyecto");
  }

  const [item, context] = await Promise.all([
    getGenstockItem(body.productId),
    getGenstockContext().catch(() => null),
  ]);
  const product = item.product;
  const unit = unitSnapshot(product.unit_id, context);
  assertQuantityAllowedForUnit(
    body.quantityRequired,
    unit.unitAllowsDecimal,
    unit.unitAbbreviation || unit.unitName || "esta unidad",
  );
  const row = await prisma.workMaterial.create({
    data: {
      workId: id,
      genstockProductId: product.id,
      productName: product.name,
      productCode: product.product_code,
      humanCode: product.human_code,
      unitId: product.unit_id,
      unitName: unit.unitName,
      unitAbbreviation: unit.unitAbbreviation,
      unitAllowsDecimal: unit.unitAllowsDecimal,
      unitMagnitude: unit.unitMagnitude,
      unitFactor: unit.unitFactor,
      unitIsBase: unit.unitIsBase,
      quantityRequired: body.quantityRequired,
      notes: body.notes || null,
    },
  });

  emit({ type: "work-changed", workId: id });
  return NextResponse.json(toMaterialDto(row), { status: 201 });
});
