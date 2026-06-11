import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "./database-url.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: getRuntimeDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// En Vercel (serverless) reutilizar la misma instancia entre invocaciones calientes.
if (process.env.VERCEL) {
  globalForPrisma.prisma = prisma;
}
