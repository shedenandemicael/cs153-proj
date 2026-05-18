-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT,
    "batchIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'INTAKE',
    "notesBrand" TEXT,
    "notesSize" TEXT,
    "notesCondition" TEXT,
    "notesDefects" TEXT,
    "purchasePrice" REAL,
    "minPrice" REAL,
    "freeformNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("createdAt", "freeformNotes", "id", "minPrice", "notesBrand", "notesCondition", "notesDefects", "notesSize", "purchasePrice", "status", "updatedAt") SELECT "createdAt", "freeformNotes", "id", "minPrice", "notesBrand", "notesCondition", "notesDefects", "notesSize", "purchasePrice", "status", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
