DO $$ BEGIN
  CREATE TYPE "TelegramLinkInitiator" AS ENUM ('web', 'telegram');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "telegram_link_codes"
  ADD COLUMN IF NOT EXISTS "initiator" "TelegramLinkInitiator" NOT NULL DEFAULT 'web';
