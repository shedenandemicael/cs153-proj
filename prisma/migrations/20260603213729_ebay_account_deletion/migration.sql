-- CreateTable
CREATE TABLE "EbayAccountRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ebayUserId" TEXT NOT NULL,
    "username" TEXT,
    "eiasToken" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EbayAccountRecord_ebayUserId_key" ON "EbayAccountRecord"("ebayUserId");
