-- Materiales necesarios por proyecto, enlazados por snapshot al producto de Genstock.
CREATE TABLE "WorkMaterial" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "genstockProductId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "humanCode" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "unitName" TEXT,
    "unitAbbreviation" TEXT,
    "unitAllowsDecimal" BOOLEAN,
    "unitMagnitude" TEXT,
    "unitFactor" TEXT,
    "unitIsBase" BOOLEAN,
    "quantityRequired" DECIMAL(18,6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkMaterial_workId_genstockProductId_key"
    ON "WorkMaterial"("workId", "genstockProductId");

CREATE INDEX "WorkMaterial_workId_idx" ON "WorkMaterial"("workId");
CREATE INDEX "WorkMaterial_genstockProductId_idx" ON "WorkMaterial"("genstockProductId");

ALTER TABLE "WorkMaterial"
    ADD CONSTRAINT "WorkMaterial_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- URL base de Genstock configurable por superadmin (pisa GENSTOCK_BASE_URL).
ALTER TABLE "AccessConfig"
  ADD COLUMN "genstockBaseUrl" TEXT;
