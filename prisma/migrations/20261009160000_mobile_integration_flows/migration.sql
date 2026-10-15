CREATE TABLE "MobileIntegrationFlow" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "codeChallenge" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "codeEnc" TEXT,
  "error" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileIntegrationFlow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MobileIntegrationFlow_stateHash_key" ON "MobileIntegrationFlow"("stateHash");
CREATE INDEX "MobileIntegrationFlow_sessionId_idx" ON "MobileIntegrationFlow"("sessionId");
CREATE INDEX "MobileIntegrationFlow_expiresAt_idx" ON "MobileIntegrationFlow"("expiresAt");
ALTER TABLE "MobileIntegrationFlow" ADD CONSTRAINT "MobileIntegrationFlow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MobileSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
