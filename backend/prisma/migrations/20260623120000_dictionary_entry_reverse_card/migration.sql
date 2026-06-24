ALTER TABLE "dictionary_entries"
ADD COLUMN "pimsleur_level_reverse" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "next_review_ms_reverse" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "alternate_learning_answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "dictionary_entries"
SET "next_review_ms_reverse" = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE "next_review_ms_reverse" = 0;
