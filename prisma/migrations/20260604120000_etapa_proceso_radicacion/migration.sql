-- Reemplaza etapa_proceso_enum con las 13 etapas del flujo de radicación.
CREATE TYPE "etapa_proceso_enum_new" AS ENUM (
  'radicacion',
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
  'rechazado',
  'terminacion'
);

ALTER TABLE "cuentas"
  ALTER COLUMN "etapa_proceso" TYPE "etapa_proceso_enum_new"
  USING (
    CASE "etapa_proceso"::text
      WHEN 'inicial' THEN 'radicacion'
      WHEN 'notificacion' THEN 'notificacion'
      WHEN 'conciliacion' THEN 'subsanacion'
      WHEN 'demanda' THEN 'mandamiento_de_pago'
      WHEN 'ejecucion' THEN 'ejecucion'
      ELSE 'radicacion'
    END::"etapa_proceso_enum_new"
  );

DROP TYPE "etapa_proceso_enum";

ALTER TYPE "etapa_proceso_enum_new" RENAME TO "etapa_proceso_enum";
