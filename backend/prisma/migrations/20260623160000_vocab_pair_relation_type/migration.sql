DO $$ BEGIN
  CREATE TYPE "VocabPairRelationType" AS ENUM ('translation', 'synonym', 'antonym', 'cognate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "vocab_pairs"
ADD COLUMN "relation_type" "VocabPairRelationType" NOT NULL DEFAULT 'translation';

DROP INDEX IF EXISTS "vocab_pairs_word_a_id_word_b_id_key";

CREATE UNIQUE INDEX "vocab_pairs_word_a_id_word_b_id_relation_type_key"
ON "vocab_pairs" ("word_a_id", "word_b_id", "relation_type");
