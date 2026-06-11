/**
 * Prisma Postgres en Vercel debe usar pooled.db.prisma.io en runtime.
 * Si DATABASE_URL apunta a db.prisma.io (direct), la reescribimos en serverless.
 */
export function getRuntimeDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no esta configurada");
  }

  const isServerless = Boolean(process.env.VERCEL);
  if (isServerless && url.includes("@db.prisma.io")) {
    return url.replace("@db.prisma.io", "@pooled.db.prisma.io");
  }

  return url;
}
