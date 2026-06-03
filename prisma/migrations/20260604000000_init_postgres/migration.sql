-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PROCESSING', 'READY', 'PUBLISHED', 'FAILED', 'INTAKE', 'GENERATED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "batchIndex" INTEGER,
    "status" "ItemStatus" NOT NULL DEFAULT 'INTAKE',
    "notesBrand" TEXT,
    "notesSize" TEXT,
    "notesCondition" TEXT,
    "notesDefects" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "freeformNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDraft" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "descriptionBullets" TEXT NOT NULL,
    "itemSpecifics" TEXT NOT NULL,
    "conditionDesc" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "startingPrice" DOUBLE PRECISION NOT NULL,
    "buyItNowPrice" DOUBLE PRECISION,
    "shippingAssumptions" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warnings" TEXT,
    "questions" TEXT,
    "pricingRationale" TEXT,
    "pricingMethod" TEXT,
    "userEditsCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "ebayOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableListing" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ebayItemId" TEXT,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,
    "soldDate" TIMESTAMP(3),
    "url" TEXT,
    "listingType" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'mock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationMetric" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "timeSavedMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldsGenerated" INTEGER NOT NULL DEFAULT 0,
    "fieldsEditedByUser" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "qualityNotes" TEXT,
    "generationStartedAt" TIMESTAMP(3),
    "generationCompletedAt" TIMESTAMP(3),
    "reviewCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbayAccountRecord" (
    "id" TEXT NOT NULL,
    "ebayUserId" TEXT NOT NULL,
    "username" TEXT,
    "eiasToken" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbayAccountRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingDraft_itemId_key" ON "ListingDraft"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationMetric_itemId_key" ON "EvaluationMetric"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EbayAccountRecord_ebayUserId_key" ON "EbayAccountRecord"("ebayUserId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedImage" ADD CONSTRAINT "UploadedImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDraft" ADD CONSTRAINT "ListingDraft_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableListing" ADD CONSTRAINT "ComparableListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationMetric" ADD CONSTRAINT "EvaluationMetric_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
