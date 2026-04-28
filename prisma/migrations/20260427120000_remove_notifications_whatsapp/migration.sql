-- Elimina tablas y enums del módulo de notificaciones WhatsApp.

DROP TABLE IF EXISTS "notification_webhook_events" CASCADE;
DROP TABLE IF EXISTS "notification_events" CASCADE;
DROP TABLE IF EXISTS "notification_sequences" CASCADE;

DROP TYPE IF EXISTS "notification_channel_enum";
DROP TYPE IF EXISTS "notification_stage_enum";
DROP TYPE IF EXISTS "notification_status_enum";
