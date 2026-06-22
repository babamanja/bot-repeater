-- Remove user points (token economy) tables and columns.
DROP TABLE IF EXISTS "token_ledger_entries";

ALTER TABLE "users" DROP COLUMN IF EXISTS "token_balance";

DROP TYPE IF EXISTS "TokenTransactionType";
