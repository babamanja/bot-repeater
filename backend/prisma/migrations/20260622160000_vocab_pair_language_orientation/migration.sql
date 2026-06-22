ALTER TABLE "vocab_pairs" ADD COLUMN "primary_language_id" INTEGER;
ALTER TABLE "vocab_pairs" ADD COLUMN "learning_language_id" INTEGER;

UPDATE "vocab_pairs" AS vp
SET
  "primary_language_id" = wa."language_id",
  "learning_language_id" = wb."language_id"
FROM "vocab_words" AS wa, "vocab_words" AS wb
WHERE vp."word_a_id" = wa."id" AND vp."word_b_id" = wb."id";
