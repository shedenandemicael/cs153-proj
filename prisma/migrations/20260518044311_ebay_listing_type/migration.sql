-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ComparableListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "ebayItemId" TEXT,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "condition" TEXT,
    "soldDate" DATETIME,
    "url" TEXT,
    "listingType" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'mock',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComparableListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ComparableListing" ("condition", "createdAt", "ebayItemId", "id", "itemId", "price", "soldDate", "source", "title", "url") SELECT "condition", "createdAt", "ebayItemId", "id", "itemId", "price", "soldDate", "source", "title", "url" FROM "ComparableListing";
DROP TABLE "ComparableListing";
ALTER TABLE "new_ComparableListing" RENAME TO "ComparableListing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
