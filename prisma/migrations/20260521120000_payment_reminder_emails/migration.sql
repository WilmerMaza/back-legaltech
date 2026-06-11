-- CreateTable
CREATE TABLE "payment_reminder_emails" (
    "id" TEXT NOT NULL,
    "propiedad_id" TEXT NOT NULL,
    "cliente_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reminder_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_payment_reminder_emails_propiedad_created" ON "payment_reminder_emails"("propiedad_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "payment_reminder_emails" ADD CONSTRAINT "payment_reminder_emails_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
