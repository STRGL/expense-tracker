-- FTS5 virtual table for full-text search on Transaction merchant and notes fields
CREATE VIRTUAL TABLE IF NOT EXISTS "TransactionFts" USING fts5(
  transactionId UNINDEXED,
  merchantRaw,
  merchantName,
  notes
);

-- Populate from existing data
INSERT INTO "TransactionFts" (transactionId, merchantRaw, merchantName, notes)
SELECT id, merchantRaw, merchantName, COALESCE(notes, '') FROM "Transaction";

-- Keep FTS in sync: INSERT
CREATE TRIGGER IF NOT EXISTS transaction_ai AFTER INSERT ON "Transaction" BEGIN
  INSERT INTO "TransactionFts"(transactionId, merchantRaw, merchantName, notes)
  VALUES (NEW.id, NEW.merchantRaw, NEW.merchantName, COALESCE(NEW.notes, ''));
END;

-- Keep FTS in sync: UPDATE
CREATE TRIGGER IF NOT EXISTS transaction_au AFTER UPDATE ON "Transaction" BEGIN
  DELETE FROM "TransactionFts" WHERE transactionId = OLD.id;
  INSERT INTO "TransactionFts"(transactionId, merchantRaw, merchantName, notes)
  VALUES (NEW.id, NEW.merchantRaw, NEW.merchantName, COALESCE(NEW.notes, ''));
END;

-- Keep FTS in sync: DELETE
CREATE TRIGGER IF NOT EXISTS transaction_ad AFTER DELETE ON "Transaction" BEGIN
  DELETE FROM "TransactionFts" WHERE transactionId = OLD.id;
END;
