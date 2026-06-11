-- AlterTable: datos de cobro por propiedad (nullable para backfill)
ALTER TABLE "propiedades" ADD COLUMN "cobro_nombre" TEXT;
ALTER TABLE "propiedades" ADD COLUMN "cobro_tipo_persona" "tipo_persona_enum";
ALTER TABLE "propiedades" ADD COLUMN "cobro_documento" TEXT;
ALTER TABLE "propiedades" ADD COLUMN "cobro_email" TEXT;

-- Backfill histórico desde clientes vinculados
UPDATE "propiedades" p
SET
  "cobro_nombre" = c."nombre",
  "cobro_tipo_persona" = c."tipo_persona",
  "cobro_documento" = c."documento",
  "cobro_email" = c."email"
FROM "clientes" c
WHERE p."cliente_id" = c."id";

-- NOT NULL tras backfill
ALTER TABLE "propiedades" ALTER COLUMN "cobro_nombre" SET NOT NULL;
ALTER TABLE "propiedades" ALTER COLUMN "cobro_tipo_persona" SET NOT NULL;
ALTER TABLE "propiedades" ALTER COLUMN "cobro_documento" SET NOT NULL;
ALTER TABLE "propiedades" ALTER COLUMN "cobro_email" SET NOT NULL;
