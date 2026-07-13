-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('LINK', 'INTERNAL');

-- CreateTable
CREATE TABLE "StorageIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "StorageProviderKind" NOT NULL,
    "nextcloudLoginName" TEXT,
    "nextcloudAppPasswordEnc" TEXT,
    "gdriveRefreshTokenEnc" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StorageIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileShare" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetSectorId" TEXT,
    "providerShareId" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkPasswordEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "FileShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageIdentity_userId_provider_key" ON "StorageIdentity"("userId", "provider");

-- CreateIndex
CREATE INDEX "FileShare_workId_idx" ON "FileShare"("workId");

-- CreateIndex
CREATE INDEX "FileShare_targetUserId_idx" ON "FileShare"("targetUserId");

-- CreateIndex
CREATE INDEX "FileShare_targetSectorId_idx" ON "FileShare"("targetSectorId");

-- AddForeignKey
ALTER TABLE "StorageIdentity" ADD CONSTRAINT "StorageIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShare" ADD CONSTRAINT "FileShare_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShare" ADD CONSTRAINT "FileShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShare" ADD CONSTRAINT "FileShare_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShare" ADD CONSTRAINT "FileShare_targetSectorId_fkey" FOREIGN KEY ("targetSectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
