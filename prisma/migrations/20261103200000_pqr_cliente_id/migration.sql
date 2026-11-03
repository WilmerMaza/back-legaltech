-- Vincula PQRS al cliente del portafolio (informe general).
ALTER TABLE "pqrs" ADD COLUMN IF NOT EXISTS "cliente_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pqrs_cliente_id_fkey'
  ) THEN
    ALTER TABLE "pqrs"
      ADD CONSTRAINT "pqrs_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pqrs_cliente" ON "pqrs"("cliente_id");
