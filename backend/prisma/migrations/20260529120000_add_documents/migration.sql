-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('uploaded', 'text_extracted', 'chunked', 'summarized', 'failed');

-- CreateEnum
CREATE TYPE "document_source_type" AS ENUM ('pdf', 'docx', 'text');

-- CreateEnum
CREATE TYPE "document_chunk_status" AS ENUM ('pending', 'summarized', 'quiz_generated', 'failed');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'uploaded',
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "source_type" "document_source_type" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_contents" (
    "document_id" UUID NOT NULL,
    "full_text" TEXT NOT NULL,

    CONSTRAINT "document_contents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "status" "document_chunk_status" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN "document_id" UUID,
ADD COLUMN "chunk_id" UUID;

-- CreateIndex
CREATE INDEX "documents_user_id_created_at_idx" ON "documents"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_document_id_chunk_index_key" ON "document_chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_status_idx" ON "document_chunks"("document_id", "status");

-- CreateIndex
CREATE INDEX "quizzes_document_id_idx" ON "quizzes"("document_id");

-- CreateIndex
CREATE INDEX "quizzes_chunk_id_idx" ON "quizzes"("chunk_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_contents" ADD CONSTRAINT "document_contents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
