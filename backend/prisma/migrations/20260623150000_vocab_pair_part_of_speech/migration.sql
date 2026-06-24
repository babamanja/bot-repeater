ALTER TABLE "vocab_pairs"
ADD COLUMN "part_of_speech" TEXT;

ALTER TABLE "vocab_words"
DROP COLUMN "part_of_speech";
