import type { Prisma } from "@prisma/client";
import { addQuantity, isWholeQuantity } from "@/lib/domain/materials/quantity";
import { badRequest } from "@/server/api";
import type { GenstockSearchContext } from "@/server/genstock";

type MaterialRow = {
  id: string;
  workId: string;
  genstockProductId: string;
  productName: string;
  productCode: string;
  humanCode: string;
  unitId: string;
  unitName: string | null;
  unitAbbreviation: string | null;
  unitAllowsDecimal: boolean | null;
  unitMagnitude: string | null;
  unitFactor: string | null;
  unitIsBase: boolean | null;
  quantityRequired: Prisma.Decimal | string | number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toMaterialDto(row: MaterialRow) {
  return {
    id: row.id,
    workId: row.workId,
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
    quantityRequired: row.quantityRequired.toString(),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface MaterialTotalRow {
  genstockProductId: string;
  productName: string;
  productCode: string;
  humanCode: string;
  unitId: string;
  unitName: string | null;
  unitAbbreviation: string | null;
  unitAllowsDecimal: boolean | null;
  unitMagnitude: string | null;
  unitFactor: string | null;
  unitIsBase: boolean | null;
  quantityRequired: string;
  work: { id: string; name: string; groupName: string | null };
}

export function buildMaterialTotals(rows: MaterialTotalRow[]) {
  const byProduct = new Map<
    string,
    {
      genstockProductId: string;
      productName: string;
      productCode: string;
      humanCode: string;
      unitId: string;
      unitName: string | null;
      unitAbbreviation: string | null;
      unitAllowsDecimal: boolean | null;
      unitMagnitude: string | null;
      unitFactor: string | null;
      unitIsBase: boolean | null;
      totalQuantityRequired: string;
      projects: {
        workId: string;
        workName: string;
        groupName: string | null;
        quantityRequired: string;
      }[];
    }
  >();

  for (const row of rows) {
    const current = byProduct.get(row.genstockProductId);
    if (!current) {
      byProduct.set(row.genstockProductId, {
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
        totalQuantityRequired: row.quantityRequired,
        projects: [
          {
            workId: row.work.id,
            workName: row.work.name,
            groupName: row.work.groupName,
            quantityRequired: row.quantityRequired,
          },
        ],
      });
      continue;
    }

    current.totalQuantityRequired = addQuantity(
      current.totalQuantityRequired,
      row.quantityRequired,
    );
    current.projects.push({
      workId: row.work.id,
      workName: row.work.name,
      groupName: row.work.groupName,
      quantityRequired: row.quantityRequired,
    });
  }

  return Array.from(byProduct.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName, "es"),
  );
}

export function unitSnapshot(unitId: string, context: GenstockSearchContext | null) {
  const unit = context?.units?.find((entry) => entry.id === unitId);
  return {
    unitName: unit?.name ?? null,
    unitAbbreviation: unit?.abbreviation ?? null,
    unitAllowsDecimal: unit?.allows_decimal ?? null,
    unitMagnitude: unit?.magnitude ?? null,
    unitFactor: unit?.factor ?? null,
    unitIsBase: unit?.is_base ?? null,
  };
}

export function assertQuantityAllowedForUnit(
  quantity: string,
  unitAllowsDecimal: boolean | null,
  unitLabel = "esta unidad",
) {
  if (unitAllowsDecimal === false && !isWholeQuantity(quantity)) {
    throw badRequest(`La cantidad para ${unitLabel} debe ser un número entero`);
  }
}
