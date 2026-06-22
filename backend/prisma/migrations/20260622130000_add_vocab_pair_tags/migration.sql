-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_pair_tags" (
    "vocab_pair_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocab_pair_tags_pkey" PRIMARY KEY ("vocab_pair_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_parent_id_idx" ON "tags"("parent_id");

-- CreateIndex
CREATE INDEX "vocab_pair_tags_tag_id_idx" ON "vocab_pair_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_pair_tags" ADD CONSTRAINT "vocab_pair_tags_vocab_pair_id_fkey" FOREIGN KEY ("vocab_pair_id") REFERENCES "vocab_pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_pair_tags" ADD CONSTRAINT "vocab_pair_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
