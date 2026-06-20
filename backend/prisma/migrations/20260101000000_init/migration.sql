-- Baseline schema (full current datamodel). Replaces incremental-only migrations that assumed prior db push.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TokenTransactionType" AS ENUM ('purchase', 'spend', 'refund', 'bonus', 'expire', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('payment', 'refund');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "SubscriptionPlanCode" AS ENUM ('basic', 'premium');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due');

-- CreateEnum
CREATE TYPE "quiz_status" AS ENUM ('generating', 'ready_to_edit', 'published', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "previous_email_for_recovery" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "deleted_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "token_balance" BIGINT NOT NULL DEFAULT 0,
    "qualification_completed_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_ledger_entries" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "delta" BIGINT NOT NULL,
    "balance_after" BIGINT,
    "transaction_type" "TokenTransactionType" NOT NULL,
    "reference_id" TEXT,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'succeeded',
    "provider" TEXT,
    "provider_transaction_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "original_payment_id" UUID,
    "refund_reason" TEXT,
    "transaction_type" "PaymentTransactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_code" "SubscriptionPlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_id" UUID,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "password_hash" TEXT,
    "google_sub" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "status" "quiz_status" NOT NULL DEFAULT 'generating',
    "generation_source_text" TEXT,
    "generation_question_count" INTEGER,
    "generation_language" TEXT,
    "generation_tokens_charged" INTEGER,
    "tokens_refunded_at" TIMESTAMP(3),

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "quiz_version" INTEGER NOT NULL DEFAULT 1,
    "user_id" INTEGER,
    "question_snapshot" JSONB,
    "answers" JSONB NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correct_count" INTEGER NOT NULL,
    "question_count" INTEGER NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_versions" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL,
    "quiz_version_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "correct_answer_ids" TEXT[],
    "position" INTEGER NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "quiz_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "quiz_generation_analytics" (
    "id" UUID NOT NULL,
    "user_id" INTEGER,
    "status" TEXT NOT NULL,
    "source_text_length" INTEGER NOT NULL,
    "generated_questions_count" INTEGER NOT NULL,
    "estimated_tokens" INTEGER NOT NULL,
    "ai_input_tokens" INTEGER,
    "ai_output_tokens" INTEGER,
    "ai_total_tokens" INTEGER,
    "ai_model" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_generation_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_submissions" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualification_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_previous_email_for_recovery_key" ON "users"("previous_email_for_recovery");

-- CreateIndex
CREATE UNIQUE INDEX "token_ledger_entries_idempotency_key_key" ON "token_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "token_ledger_entries_user_id_created_at_idx" ON "token_ledger_entries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "token_ledger_entries_transaction_type_created_at_idx" ON "token_ledger_entries"("transaction_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_user_id_date_idx" ON "payments"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_id_key" ON "auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_google_sub_key" ON "auth"("google_sub");

-- CreateIndex
CREATE INDEX "quiz_versions_quiz_id_version_idx" ON "quiz_versions"("quiz_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_versions_quiz_id_version_key" ON "quiz_versions"("quiz_id", "version");

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_version_id_position_idx" ON "quiz_questions"("quiz_version_id", "position");

-- CreateIndex
CREATE INDEX "quiz_question_options_question_id_position_idx" ON "quiz_question_options"("question_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_options_question_id_answer_id_key" ON "quiz_question_options"("question_id", "answer_id");

-- CreateIndex
CREATE INDEX "quiz_generation_analytics_created_at_idx" ON "quiz_generation_analytics"("created_at" DESC);

-- CreateIndex
CREATE INDEX "quiz_generation_analytics_user_id_created_at_idx" ON "quiz_generation_analytics"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "qualification_submissions_user_id_key" ON "qualification_submissions"("user_id");

-- CreateIndex
CREATE INDEX "qualification_submissions_submitted_at_idx" ON "qualification_submissions"("submitted_at" DESC);

-- AddForeignKey
ALTER TABLE "token_ledger_entries" ADD CONSTRAINT "token_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth" ADD CONSTRAINT "auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_versions" ADD CONSTRAINT "quiz_versions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_version_id_fkey" FOREIGN KEY ("quiz_version_id") REFERENCES "quiz_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_options" ADD CONSTRAINT "quiz_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_generation_analytics" ADD CONSTRAINT "quiz_generation_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_submissions" ADD CONSTRAINT "qualification_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
