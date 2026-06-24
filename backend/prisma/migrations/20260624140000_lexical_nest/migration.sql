-- Create lexical nests
CREATE TABLE "lexical_nests" (
    "id" SERIAL NOT NULL,
    "language_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lexical_nests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lexical_nests_language_id_idx" ON "lexical_nests"("language_id");

ALTER TABLE "lexical_nests"
ADD CONSTRAINT "lexical_nests_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add nest_id to vocab words (nullable during backfill)
ALTER TABLE "vocab_words" ADD COLUMN "nest_id" INTEGER;

CREATE INDEX "vocab_words_nest_id_idx" ON "vocab_words"("nest_id");

-- One nest per existing word
DO $$
DECLARE
  w RECORD;
  new_nest_id INT;
BEGIN
  FOR w IN SELECT id, language_id FROM vocab_words WHERE nest_id IS NULL
  LOOP
    INSERT INTO lexical_nests (language_id, created_at)
    VALUES (w.language_id, CURRENT_TIMESTAMP)
    RETURNING id INTO new_nest_id;

    UPDATE vocab_words SET nest_id = new_nest_id WHERE id = w.id;
  END LOOP;
END $$;

-- Merge nests linked by inflection pairs
DO $$
DECLARE
  r RECORD;
  nest_a INT;
  nest_b INT;
  target_nest INT;
  source_nest INT;
BEGIN
  FOR r IN SELECT word_a_id, word_b_id FROM vocab_pairs WHERE relation_type = 'inflection'
  LOOP
    SELECT nest_id INTO nest_a FROM vocab_words WHERE id = r.word_a_id;
    SELECT nest_id INTO nest_b FROM vocab_words WHERE id = r.word_b_id;

    IF nest_a IS NULL OR nest_b IS NULL OR nest_a = nest_b THEN
      CONTINUE;
    END IF;

    target_nest := LEAST(nest_a, nest_b);
    source_nest := GREATEST(nest_a, nest_b);

    UPDATE vocab_words SET nest_id = target_nest WHERE nest_id = source_nest;
    DELETE FROM lexical_nests WHERE id = source_nest;
  END LOOP;
END $$;

DELETE FROM vocab_pairs WHERE relation_type = 'inflection';

ALTER TABLE "vocab_words" ALTER COLUMN "nest_id" SET NOT NULL;

ALTER TABLE "vocab_words"
ADD CONSTRAINT "vocab_words_nest_id_fkey"
FOREIGN KEY ("nest_id") REFERENCES "lexical_nests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
