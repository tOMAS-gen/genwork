-- CreateTable
CREATE TABLE "NextcloudLoginFlow" (
    "token" TEXT NOT NULL,
    "pollEndpoint" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextcloudLoginFlow_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "NextcloudLoginFlow_userId_idx" ON "NextcloudLoginFlow"("userId");
