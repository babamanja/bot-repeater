-- CreateEnum
CREATE TYPE "pdf_ocr_job_status" AS ENUM ('awaiting_confirmation', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "pdf_ocr_job_page_status" AS ENUM ('text_extracted', 'needs_ocr', 'ocr_completed', 'ocr_failed');

-- CreateTable
CREATE TABLE "pdf_ocr_jobs" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "original_filename" TEXT NOT NULL,
    "status" "pdf_ocr_job_status" NOT NULL,
    "total_pages" INTEGER NOT NULL,
    "pages_needing_ocr" INTEGER NOT NULL,
    "pages_completed" INTEGER NOT NULL DEFAULT 0,
    "token_cost_per_page" INTEGER NOT NULL,
    "tokens_charged" INTEGER NOT NULL DEFAULT 0,
    "assembled_text" TEXT,
    "pdf_data" BYTEA NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_ocr_job_pages" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "page_index" INTEGER NOT NULL,
    "status" "pdf_ocr_job_page_status" NOT NULL,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_ocr_job_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_ocr_jobs_user_id_created_at_idx" ON "pdf_ocr_jobs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pdf_ocr_jobs_status_idx" ON "pdf_ocr_jobs"("status");

-- CreateIndex
CREATE INDEX "pdf_ocr_job_pages_job_id_page_index_idx" ON "pdf_ocr_job_pages"("job_id", "page_index");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_ocr_job_pages_job_id_page_index_key" ON "pdf_ocr_job_pages"("job_id", "page_index");

-- AddForeignKey
ALTER TABLE "pdf_ocr_jobs" ADD CONSTRAINT "pdf_ocr_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_ocr_job_pages" ADD CONSTRAINT "pdf_ocr_job_pages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "pdf_ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
