/**
 * Prisma Postgres: la app debe usar pooled.db.prisma.io en runtime.
 * db.prisma.io es solo para migraciones/CLI.
 */
export function getRuntimeDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no esta configurada");
  }

  if (url.includes("@db.prisma.io") && !url.includes("@pooled.db.prisma.io")) {
    return url.replace("@db.prisma.io", "@pooled.db.prisma.io");
  }

  return url;
}

/** Aplica la URL pooled antes de que Prisma Client lea DATABASE_URL. */
export function ensureRuntimeDatabaseUrl(): void {
  process.env.DATABASE_URL = getRuntimeDatabaseUrl();
}
