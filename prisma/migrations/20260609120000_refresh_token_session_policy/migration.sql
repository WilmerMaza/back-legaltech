-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "session_expires_at" TIMESTAMP(3);
ALTER TABLE "refresh_tokens" ADD COLUMN "last_used_at" TIMESTAMP(3);

-- Backfill existing sessions
UPDATE "refresh_tokens"
SET
  "session_expires_at" = LEAST("expires_at", "created_at" + INTERVAL '1 day'),
  "last_used_at" = "created_at"
WHERE "session_expires_at" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "session_expires_at" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "last_used_at" SET NOT NULL;
