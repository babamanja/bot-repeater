CREATE TABLE "user_feedback" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_feedback_user_id_created_at_idx" ON "user_feedback"("user_id", "created_at" DESC);
CREATE INDEX "user_feedback_created_at_idx" ON "user_feedback"("created_at" DESC);

ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
