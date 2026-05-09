-- AlterTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "merchantRaw" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "importBatchId" TEXT,
    "paymentFromUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_paymentFromUserId_fkey" FOREIGN KEY ("paymentFromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("id", "date", "merchantRaw", "merchantName", "totalAmount", "notes", "createdById", "importBatchId", "createdAt", "updatedAt") SELECT "id", "date", "merchantRaw", "merchantName", "totalAmount", "notes", "createdById", "importBatchId", "createdAt", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_paymentFromUserId_idx" ON "Transaction"("paymentFromUserId");
PRAGMA foreign_keys=ON;
