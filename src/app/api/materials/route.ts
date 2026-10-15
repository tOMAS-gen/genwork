import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { access } from "@/lib/domain/permissions";
import { requireInternal } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { buildMaterialTotals } from "@/server/materials";
import { withApi } from "@/server/api";

export const GET = withApi(async () => {
  const session = await requireInternal();
  const ctx = await getUserContext(session.user.id);

  const works = await prisma.work.findMany({
    where: { status: "ACTIVE", isTemplate: false },
    include: { group: { select: { id: true, name: true, publicRead: true } } },
    orderBy: { createdAt: "desc" },
  });

  const visibleWorkIds = works
    .filter(
      (work) =>
        access(ctx, {
          groupId: work.groupId,
          ownerId: work.ownerId,
          groupPublicRead: work.group?.publicRead ?? false,
        }) !== "none",
    )
    .map((work) => work.id);

  if (visibleWorkIds.length === 0) return NextResponse.json([]);

  const rows = await prisma.workMaterial.findMany({
    where: { workId: { in: visibleWorkIds } },
    orderBy: [{ productName: "asc" }, { work: { name: "asc" } }],
    include: { work: { include: { group: { select: { name: true } } } } },
  });

  return NextResponse.json(
    buildMaterialTotals(
      rows.map((row) => ({
        genstockProductId: row.genstockProductId,
        productName: row.productName,
        productCode: row.productCode,
        humanCode: row.humanCode,
        unitId: row.unitId,
        unitName: row.unitName,
        unitAbbreviation: row.unitAbbreviation,
        unitAllowsDecimal: row.unitAllowsDecimal,
        unitMagnitude: row.unitMagnitude,
        unitFactor: row.unitFactor,
        unitIsBase: row.unitIsBase,
        quantityRequired: (row.quantityRequired as Prisma.Decimal).toString(),
        work: {
          id: row.work.id,
          name: row.work.name,
          groupName: row.work.group?.name ?? null,
        },
      })),
    ),
  );
});
