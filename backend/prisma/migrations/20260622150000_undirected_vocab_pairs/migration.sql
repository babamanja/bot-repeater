ALTER TABLE "vocab_pairs" ADD COLUMN IF NOT EXISTS "word_a_id" INTEGER;
ALTER TABLE "vocab_pairs" ADD COLUMN IF NOT EXISTS "word_b_id" INTEGER;

UPDATE "vocab_pairs"
SET
  "word_a_id" = LEAST("primary_word_id", "learning_word_id"),
  "word_b_id" = GREATEST("primary_word_id", "learning_word_id")
WHERE "word_a_id" IS NULL OR "word_b_id" IS NULL;

-- Merge duplicate canonical pairs: keep the lowest id per (word_a_id, word_b_id).
WITH "pair_map" AS (
  SELECT
    "id" AS "duplicate_id",
    MIN("id") OVER (PARTITION BY "word_a_id", "word_b_id") AS "keep_id"
  FROM "vocab_pairs"
),
"duplicates" AS (
  SELECT "duplicate_id", "keep_id"
  FROM "pair_map"
  WHERE "duplicate_id" <> "keep_id"
)
UPDATE "user_pairs" AS "up"
SET "vocab_pair_id" = "d"."keep_id"
FROM "duplicates" AS "d"
WHERE "up"."vocab_pair_id" = "d"."duplicate_id"
  AND NOT EXISTS (
    SELECT 1
    FROM "user_pairs" AS "existing"
    WHERE "existing"."user_id" = "up"."user_id"
      AND "existing"."vocab_pair_id" = "d"."keep_id"
  );

WITH "pair_map" AS (
  SELECT
    "id" AS "duplicate_id",
    MIN("id") OVER (PARTITION BY "word_a_id", "word_b_id") AS "keep_id"
  FROM "vocab_pairs"
),
"duplicates" AS (
  SELECT "duplicate_id", "keep_id"
  FROM "pair_map"
  WHERE "duplicate_id" <> "keep_id"
)
DELETE FROM "user_pairs" AS "up"
USING "duplicates" AS "d"
WHERE "up"."vocab_pair_id" = "d"."duplicate_id";

WITH "pair_map" AS (
  SELECT
    "id" AS "duplicate_id",
    MIN("id") OVER (PARTITION BY "word_a_id", "word_b_id") AS "keep_id"
  FROM "vocab_pairs"
),
"duplicates" AS (
  SELECT "duplicate_id", "keep_id"
  FROM "pair_map"
  WHERE "duplicate_id" <> "keep_id"
)
UPDATE "vocab_pair_tags" AS "vpt"
SET "vocab_pair_id" = "d"."keep_id"
FROM "duplicates" AS "d"
WHERE "vpt"."vocab_pair_id" = "d"."duplicate_id"
  AND NOT EXISTS (
    SELECT 1
    FROM "vocab_pair_tags" AS "existing"
    WHERE "existing"."vocab_pair_id" = "d"."keep_id"
      AND "existing"."tag_id" = "vpt"."tag_id"
  );

WITH "pair_map" AS (
  SELECT
    "id" AS "duplicate_id",
    MIN("id") OVER (PARTITION BY "word_a_id", "word_b_id") AS "keep_id"
  FROM "vocab_pairs"
),
"duplicates" AS (
  SELECT "duplicate_id", "keep_id"
  FROM "pair_map"
  WHERE "duplicate_id" <> "keep_id"
)
DELETE FROM "vocab_pair_tags" AS "vpt"
USING "duplicates" AS "d"
WHERE "vpt"."vocab_pair_id" = "d"."duplicate_id";

WITH "pair_map" AS (
  SELECT
    "id" AS "duplicate_id",
    MIN("id") OVER (PARTITION BY "word_a_id", "word_b_id") AS "keep_id"
  FROM "vocab_pairs"
)
DELETE FROM "vocab_pairs" AS "vp"
USING "pair_map" AS "pm"
WHERE "vp"."id" = "pm"."duplicate_id"
  AND "pm"."duplicate_id" <> "pm"."keep_id";

ALTER TABLE "vocab_pairs" DROP CONSTRAINT IF EXISTS "vocab_pairs_primary_word_id_fkey";
ALTER TABLE "vocab_pairs" DROP CONSTRAINT IF EXISTS "vocab_pairs_learning_word_id_fkey";

DROP INDEX IF EXISTS "vocab_pairs_primary_word_id_learning_word_id_key";

ALTER TABLE "vocab_pairs" DROP COLUMN IF EXISTS "primary_word_id";
ALTER TABLE "vocab_pairs" DROP COLUMN IF EXISTS "learning_word_id";

ALTER TABLE "vocab_pairs" ALTER COLUMN "word_a_id" SET NOT NULL;
ALTER TABLE "vocab_pairs" ALTER COLUMN "word_b_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "vocab_pairs_word_a_id_word_b_id_key"
  ON "vocab_pairs"("word_a_id", "word_b_id");

DO $$ BEGIN
  ALTER TABLE "vocab_pairs"
    ADD CONSTRAINT "vocab_pairs_word_order_check" CHECK ("word_a_id" < "word_b_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vocab_pairs"
    ADD CONSTRAINT "vocab_pairs_word_a_id_fkey"
    FOREIGN KEY ("word_a_id") REFERENCES "vocab_words"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vocab_pairs"
    ADD CONSTRAINT "vocab_pairs_word_b_id_fkey"
    FOREIGN KEY ("word_b_id") REFERENCES "vocab_words"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
