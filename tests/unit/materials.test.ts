import { describe, expect, it } from "vitest";
import { addQuantity, isWholeQuantity, normalizeQuantity } from "@/lib/domain/materials/quantity";
import { buildMaterialTotals } from "@/server/materials";

describe("material quantities", () => {
  it("normaliza cantidades positivas con punto o coma", () => {
    expect(normalizeQuantity("001,5000")).toBe("1.5");
    expect(normalizeQuantity("2.250000")).toBe("2.25");
    expect(normalizeQuantity("0")).toBeNull();
    expect(normalizeQuantity("-1")).toBeNull();
    expect(normalizeQuantity("1.1234567")).toBeNull();
  });

  it("suma cantidades fraccionables sin perder precisión decimal", () => {
    expect(addQuantity("1.2", "3.05")).toBe("4.25");
    expect(addQuantity("0.000001", "2")).toBe("2.000001");
  });

  it("detecta cantidades enteras para unidades sin decimales", () => {
    expect(isWholeQuantity("3")).toBe(true);
    expect(isWholeQuantity("3.0")).toBe(true);
    expect(isWholeQuantity("3.5")).toBe(false);
  });
});

describe("buildMaterialTotals", () => {
  it("agrupa por producto y conserva el desglose por proyecto", () => {
    const rows = [
      {
        genstockProductId: "prod-1",
        productName: "Cemento",
        productCode: "CEM",
        humanCode: "CEM",
        unitId: "unit-1",
        unitName: "Bolsa",
        unitAbbreviation: "bol",
        unitAllowsDecimal: false,
        unitMagnitude: "kg",
        unitFactor: "25",
        unitIsBase: false,
        quantityRequired: "2.5",
        work: { id: "work-1", name: "Obra A", groupName: "Grupo" },
      },
      {
        genstockProductId: "prod-1",
        productName: "Cemento",
        productCode: "CEM",
        humanCode: "CEM",
        unitId: "unit-1",
        unitName: "Bolsa",
        unitAbbreviation: "bol",
        unitAllowsDecimal: false,
        unitMagnitude: "kg",
        unitFactor: "25",
        unitIsBase: false,
        quantityRequired: "1.25",
        work: { id: "work-2", name: "Obra B", groupName: null },
      },
    ];

    expect(buildMaterialTotals(rows)).toEqual([
      {
        genstockProductId: "prod-1",
        productName: "Cemento",
        productCode: "CEM",
        humanCode: "CEM",
        unitId: "unit-1",
        unitName: "Bolsa",
        unitAbbreviation: "bol",
        unitAllowsDecimal: false,
        unitMagnitude: "kg",
        unitFactor: "25",
        unitIsBase: false,
        totalQuantityRequired: "3.75",
        projects: [
          { workId: "work-1", workName: "Obra A", groupName: "Grupo", quantityRequired: "2.5" },
          { workId: "work-2", workName: "Obra B", groupName: null, quantityRequired: "1.25" },
        ],
      },
    ]);
  });
});
