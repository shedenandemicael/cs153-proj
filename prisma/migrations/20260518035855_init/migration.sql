-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'INTAKE',
    "notesBrand" TEXT,
    "notesSize" TEXT,
    "notesCondition" TEXT,
    "notesDefects" TEXT,
    "purchasePrice" REAL,
    "minPrice" REAL,
    "freeformNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListingDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "descriptionBullets" TEXT NOT NULL,
    "itemSpecifics" TEXT NOT NULL,
    "conditionDesc" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "startingPrice" REAL NOT NULL,
    "buyItNowPrice" REAL,
    "shippingAssumptions" TEXT,
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "warnings" TEXT,
    "questions" TEXT,
    "userEditsCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" DATETIME,
    "publishedAt" DATETIME,
    "ebayOfferId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ListingDraft_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComparableListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "ebayItemId" TEXT,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "condition" TEXT,
    "soldDate" DATETIME,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'mock',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComparableListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "timeSavedMinutes" REAL NOT NULL DEFAULT 0,
    "fieldsGenerated" INTEGER NOT NULL DEFAULT 0,
    "fieldsEditedByUser" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" REAL,
    "qualityNotes" TEXT,
    "generationStartedAt" DATETIME,
    "generationCompletedAt" DATETIME,
    "reviewCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvaluationMetric_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingDraft_itemId_key" ON "ListingDraft"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationMetric_itemId_key" ON "EvaluationMetric"("itemId");
