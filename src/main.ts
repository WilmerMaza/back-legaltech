import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./shared/infrastructure/prisma/prisma.client.js";

const app = createApp();

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`API escuchando en http://0.0.0.0:${port}`);
  });

  async function shutdown(signal: string) {
    console.log(`${signal} recibido, cerrando API...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

export default app;
