/// <reference path="./types/express.d.ts" />
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { v1Router } from "./routes/v1.routes.js";
import { errorHandler, notFoundHandler } from "./shared/http/error-handler.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.get("/", (req, res) => {
    res.json({
      name: "LegalTech API",
      version: "1.0.0",
      status: "online",
      message: "Bienvenido a la API de LegalTech. Usa /api/v1 para acceder a los recursos.",
    });
  });

  app.use("/api/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
