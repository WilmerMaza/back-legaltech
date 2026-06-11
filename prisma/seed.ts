import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ADMINS = [
  {
    email: process.env.SEED_ADMIN_EMAIL || "admin@legaltech.com",
    password: process.env.SEED_ADMIN_PASSWORD || "admin123",
  },
  { email: "operador@legaltech.com", password: "admin123" },
  { email: "gestor@legaltech.com", password: "admin123" },
] as const;

async function main() {
  for (const admin of DEFAULT_ADMINS) {
    const password_hash = await argon2.hash(admin.password);
    await prisma.usuario.upsert({
      where: { email: admin.email },
      update: { password_hash, role: "admin", cliente_id: null },
      create: { email: admin.email, password_hash, role: "admin", cliente_id: null },
    });
    console.log(`Admin seed listo: ${admin.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
