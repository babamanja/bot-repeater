-- Create dictionaries
CREATE TABLE "dictionaries" (
    "id" SERIAL NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My dictionary',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dictionaries_creator_id_idx" ON "dictionaries"("creator_id");

ALTER TABLE "dictionaries"
ADD CONSTRAINT "dictionaries_creator_id_fkey"
FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create dictionary entries (replaces user_pairs)
CREATE TABLE "dictionary_entries" (
    "dictionary_id" INTEGER NOT NULL,
    "vocab_pair_id" INTEGER NOT NULL,
    "pimsleur_level" INTEGER NOT NULL DEFAULT 0,
    "next_review_ms" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("dictionary_id","vocab_pair_id")
);

CREATE INDEX "dictionary_entries_dictionary_id_next_review_ms_idx"
ON "dictionary_entries"("dictionary_id", "next_review_ms");

ALTER TABLE "dictionary_entries"
ADD CONSTRAINT "dictionary_entries_dictionary_id_fkey"
FOREIGN KEY ("dictionary_id") REFERENCES "dictionaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dictionary_entries"
ADD CONSTRAINT "dictionary_entries_vocab_pair_id_fkey"
FOREIGN KEY ("vocab_pair_id") REFERENCES "vocab_pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User ↔ dictionary membership
CREATE TABLE "user_dictionaries" (
    "user_id" INTEGER NOT NULL,
    "dictionary_id" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_dictionaries_pkey" PRIMARY KEY ("user_id","dictionary_id")
);

CREATE INDEX "user_dictionaries_user_id_is_default_idx"
ON "user_dictionaries"("user_id", "is_default");

ALTER TABLE "user_dictionaries"
ADD CONSTRAINT "user_dictionaries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_dictionaries"
ADD CONSTRAINT "user_dictionaries_dictionary_id_fkey"
FOREIGN KEY ("dictionary_id") REFERENCES "dictionaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one default dictionary per user
INSERT INTO "dictionaries" ("creator_id", "name", "created_at")
SELECT u."id", 'My dictionary', u."created_at"
FROM "users" u
WHERE u."deleted_at" IS NULL;

INSERT INTO "user_dictionaries" ("user_id", "dictionary_id", "is_default", "created_at")
SELECT d."creator_id", d."id", true, d."created_at"
FROM "dictionaries" d;

-- Migrate user_pairs → dictionary_entries in each user's default dictionary
INSERT INTO "dictionary_entries" (
    "dictionary_id",
    "vocab_pair_id",
    "pimsleur_level",
    "next_review_ms",
    "created_at"
)
SELECT ud."dictionary_id", up."vocab_pair_id", up."pimsleur_level", up."next_review_ms", CURRENT_TIMESTAMP
FROM "user_pairs" up
INNER JOIN "user_dictionaries" ud
    ON ud."user_id" = up."user_id" AND ud."is_default" = true
ON CONFLICT ("dictionary_id", "vocab_pair_id") DO NOTHING;

DROP TABLE "user_pairs";
