-- Add parentId, distributeCost, isSystemLine to Transaction (table recreation required for FK)
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
    "parentId" TEXT,
    "distributeCost" BOOLEAN NOT NULL DEFAULT false,
    "isSystemLine" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_paymentFromUserId_fkey" FOREIGN KEY ("paymentFromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Transaction" SELECT
    "id", "date", "merchantRaw", "merchantName", "totalAmount", "notes",
    "createdById", "importBatchId", "paymentFromUserId",
    NULL, 0, 0,
    "createdAt", "updatedAt"
FROM "Transaction";

DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

CREATE INDEX "Transaction_paymentFromUserId_idx" ON "Transaction"("paymentFromUserId");

-- Recreate SplitSuggestion with onDelete: Cascade
CREATE TABLE "new_SplitSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "suggestedChanges" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "SplitSuggestion_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SplitSuggestion_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SplitSuggestion_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_SplitSuggestion" SELECT * FROM "SplitSuggestion";
DROP TABLE "SplitSuggestion";
ALTER TABLE "new_SplitSuggestion" RENAME TO "SplitSuggestion";

-- Add hiddenAt to TransactionSplit
ALTER TABLE "TransactionSplit" ADD COLUMN "hiddenAt" DATETIME;

-- Add hasAcknowledgedSplitWarning to User
ALTER TABLE "User" ADD COLUMN "hasAcknowledgedSplitWarning" BOOLEAN NOT NULL DEFAULT false;

PRAGMA foreign_keys=ON;
PRAGMA foreign_key_check;
