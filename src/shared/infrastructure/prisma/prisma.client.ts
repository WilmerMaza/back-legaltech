import { PrismaClient } from "@prisma/client";
import { ensureRuntimeDatabaseUrl } from "./database-url.js";

ensureRuntimeDatabaseUrl();

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (process.env.VERCEL) {
  globalForPrisma.prisma = prisma;
}
