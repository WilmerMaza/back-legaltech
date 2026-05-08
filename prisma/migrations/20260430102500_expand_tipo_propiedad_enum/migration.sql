-- Expande tipo_propiedad_enum con nuevos valores permitidos para propiedades.
ALTER TYPE "tipo_propiedad_enum" ADD VALUE IF NOT EXISTS 'oficina';
ALTER TYPE "tipo_propiedad_enum" ADD VALUE IF NOT EXISTS 'casa';
ALTER TYPE "tipo_propiedad_enum" ADD VALUE IF NOT EXISTS 'bodega';
ALTER TYPE "tipo_propiedad_enum" ADD VALUE IF NOT EXISTS 'garaje';
