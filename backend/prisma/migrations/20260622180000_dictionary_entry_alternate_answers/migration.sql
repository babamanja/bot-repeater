ALTER TABLE "dictionary_entries"
ADD COLUMN "alternate_primary_answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
