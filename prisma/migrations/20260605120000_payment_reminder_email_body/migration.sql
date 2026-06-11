ALTER TABLE "payment_reminder_emails"
  ADD COLUMN IF NOT EXISTS "body_html" TEXT,
  ADD COLUMN IF NOT EXISTS "body_text" TEXT;
