ALTER TABLE "document_chunks"
ADD COLUMN "ai_input_tokens" INTEGER,
ADD COLUMN "ai_output_tokens" INTEGER,
ADD COLUMN "ai_total_tokens" INTEGER,
ADD COLUMN "ai_model" TEXT;

CREATE INDEX "document_chunks_created_at_idx" ON "document_chunks"("created_at" DESC);
