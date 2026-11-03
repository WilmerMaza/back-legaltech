-- Nuevas etapas de proceso: Admisión, Recurso, Traslado y Otro.
-- Se recrea el enum (ADD VALUE no puede ir en la misma transacción de Prisma Migrate).
CREATE TYPE "etapa_proceso_enum_new" AS ENUM (
  'radicacion',
  'admision',
  'inadmision',
  'subsanacion',
  'mandamiento_de_pago',
  'medidas_radicadas',
  'notificacion',
  'sentencia',
  'liquidacion_de_costas',
  'ejecucion',
  'liquidacion_del_credito',
  'remate',
  'recurso',
  'traslado',
  'otro',
  'rechazado',
  'suspendido',
  'terminacion'
);

ALTER TABLE "procesos_legales"
  ALTER COLUMN "etapa_proceso" TYPE "etapa_proceso_enum_new"
  USING ("etapa_proceso"::text::"etapa_proceso_enum_new");

DROP TYPE "etapa_proceso_enum";

ALTER TYPE "etapa_proceso_enum_new" RENAME TO "etapa_proceso_enum";
