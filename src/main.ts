import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./shared/infrastructure/prisma/prisma.client.js";
import { v1Router } from "./routes/v1.routes.js";

const port = Number(process.env.PORT) || 3000;
export const app = createApp();
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API escuchando en http://0.0.0.0:${port}`);
});

export default app;

app.use("/v1", v1Router);

async function shutdown(signal: string) {
  console.log(`${signal} recibido, cerrando API...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
